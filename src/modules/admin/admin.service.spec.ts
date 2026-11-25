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
import { UploadAzureService } from '../../common/services/upload.azure.service.js';

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
        { provide: UploadAzureService, useValue: {} },
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
        { provide: UploadAzureService, useValue: {} },
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

describe('AdminService - most reported users', () => {
  let service: AdminService;
  let tx: any;

  beforeEach(async () => {
    tx = {
      $queryRaw: jest.fn(async () => [
        { id_usuario: 2, denuncias: 3 },
        { id_usuario: 5, denuncias: 1 },
      ]),
      usuario: {
        findFirst: jest.fn(async (args: any) => ({
          id: args.where.id,
          nome_usuario: `user${args.where.id}`,
        })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        AdminValidator,
        { provide: UploadAzureService, useValue: {} },
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn(async (fn: any) => fn(tx)) },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('Should rank the users by the reports their reviews received, not by their reviews.', async () => {
    const result = await service.most_reported({});

    const [strings] = tx.$queryRaw.mock.calls[0];
    const sql = strings.join('?');
    expect(sql).toContain('FROM "Denuncia" d');
    expect(sql).toContain('COUNT(d.id)');

    expect(result.data).toEqual([
      { id: 2, nome_usuario: 'user2', denuncias: 3 },
      { id: 5, nome_usuario: 'user5', denuncias: 1 },
    ]);
  });

  it('Should answer 404 when no review was reported in the period.', async () => {
    tx.$queryRaw.mockResolvedValue([]);

    await expect(service.most_reported({})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('AdminValidator - user photos', () => {
  let validator: AdminValidator;
  const getUserImageUrl = jest.fn(
    async (blob: string) => `https://signed/${blob}`,
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminValidator,
        {
          provide: PrismaService,
          useValue: {
            usuario: {
              findMany: jest.fn(async () => [
                { id: 1, foto_url: 'user-1.png' },
                { id: 2, foto_url: null },
              ]),
              count: jest.fn(async () => 2),
            },
          },
        },
        { provide: UploadAzureService, useValue: { getUserImageUrl } },
      ],
    }).compile();

    validator = module.get<AdminValidator>(AdminValidator);
  });

  it('Should return the user photos as signed URLs and keep the users without photo.', async () => {
    const result = await validator.get_users();

    expect(result.data).toEqual([
      { id: 1, foto_url: 'https://signed/user-1.png' },
      { id: 2, foto_url: null },
    ]);
    expect(getUserImageUrl).toHaveBeenCalledTimes(1);
  });
});
