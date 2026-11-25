import { beforeEach, describe, jest, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminValidator } from './utils/validator/admin.validator.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AdminService - automatic blocks', () => {
  let service: AdminService;
  let prisma: any;

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

    const result = await service.review_auto_block(7, {
      status: 'AUTORIZADA',
    });

    expect(prisma.review.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: 'AUTORIZADA' },
    });
    const classificacao = prisma.classificacao_review.update.mock.calls[0][0];
    expect(classificacao.where).toEqual({ id_review: 7 });
    expect(classificacao.data.decisao_admin).toBe('AUTORIZADA');
    expect(classificacao.data.revisado_em).toBeInstanceOf(Date);
    expect(result.message).toContain('revertido');
  });

  it('Should refuse a review the classifier did not block.', async () => {
    prisma.review.findFirst.mockResolvedValue({
      id: 7,
      classificacao: { ofensivo: false },
    });

    await expect(
      service.review_auto_block(7, { status: 'AUTORIZADA' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('Should refuse a review that does not exist.', async () => {
    prisma.review.findFirst.mockResolvedValue(null);

    await expect(
      service.review_auto_block(99, { status: 'OFENSIVA' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
