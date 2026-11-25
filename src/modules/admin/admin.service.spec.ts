import { beforeEach, describe, jest, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminValidator } from './utils/validator/admin.validator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';

describe('AdminService - automatic blocks', () => {
  let service: AdminService;
  let prisma: any;
  const token = { sub: 3 } as PayloadDTO;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (ops: any) => ops),
      review: {
        findFirst: jest.fn(),
        update: jest.fn((args: any) => ({ op: 'review.update', args })),
      },
      classificacao_review: {
        update: jest.fn((args: any) => ({ op: 'classificacao.update', args })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        AdminValidator,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('Should revert an automatic block and record the admin review.', async () => {
    prisma.review.findFirst.mockResolvedValue({
      id: 7,
      classificacao: { ofensivo: true },
    });

    const result = await service.review_auto_block(
      7,
      { status: 'AUTORIZADA' },
      token,
    );

    expect(prisma.review.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: 'AUTORIZADA' },
    });
    const classificacao = prisma.classificacao_review.update.mock.calls[0][0];
    expect(classificacao.where).toEqual({ id_review: 7 });
    expect(classificacao.data.decisao_admin).toBe('AUTORIZADA');
    expect(classificacao.data.revisado_em).toBeInstanceOf(Date);
    expect(classificacao.data.id_revisor).toBe(3);
    expect(result.message).toContain('revertido');
  });

  it('Should refuse a review the classifier did not block.', async () => {
    prisma.review.findFirst.mockResolvedValue({
      id: 7,
      classificacao: { ofensivo: false },
    });

    await expect(
      service.review_auto_block(7, { status: 'AUTORIZADA' }, token),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('Should refuse a review that does not exist.', async () => {
    prisma.review.findFirst.mockResolvedValue(null);

    await expect(
      service.review_auto_block(99, { status: 'OFENSIVA' }, token),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AdminService - report moderation', () => {
  let service: AdminService;
  let prisma: any;
  let tx: any;
  const token = { sub: 3 } as PayloadDTO;

  beforeEach(async () => {
    tx = {
      denuncia: { updateMany: jest.fn(async () => ({ count: 1 })) },
      review: { update: jest.fn(async () => ({})) },
    };
    prisma = {
      $transaction: jest.fn(async (fn: any) => fn(tx)),
      denuncia: {
        findUnique: jest.fn(async () => ({ id: 5, id_review: 9 })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        AdminValidator,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('Should record the decision and the admin when discarding a report.', async () => {
    await service.moderate(5, { status: 'AUTORIZADA' }, token);

    const closed = tx.denuncia.updateMany.mock.calls[0][0];
    expect(closed.where).toEqual({ id: 5, status: { not: 'FECHADA' } });
    expect(closed.data.status).toBe('FECHADA');
    expect(closed.data.decisao).toBe('AUTORIZADA');
    expect(closed.data.id_revisor).toBe(3);
    expect(closed.data.revisado_em).toBeInstanceOf(Date);
    // Discarding closes only this report.
    expect(tx.denuncia.updateMany).toHaveBeenCalledTimes(1);
  });

  it('Should close the other open reports of a blocked review with the same decision.', async () => {
    await service.moderate(5, { status: 'OFENSIVA' }, token);

    const others = tx.denuncia.updateMany.mock.calls[1][0];
    expect(others.where).toEqual({
      id_review: 9,
      status: { not: 'FECHADA' },
    });
    expect(others.data.decisao).toBe('OFENSIVA');
    expect(others.data.id_revisor).toBe(3);
    expect(tx.review.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { status: 'OFENSIVA' },
    });
  });

  it('Should refuse a report that is already closed.', async () => {
    tx.denuncia.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.moderate(5, { status: 'AUTORIZADA' }, token),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.review.update).not.toHaveBeenCalled();
  });
});
