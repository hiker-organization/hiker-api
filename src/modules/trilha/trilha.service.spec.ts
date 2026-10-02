import { beforeEach, describe, jest, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TrilhaService } from './trilha.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { UploadAzureServiceMock } from '../review/mocks/uploadAzureService.mock.js';
import { CreateTrilhaDTO } from './dtos/create-trilha.dto.js';

const token = {
  sub: 1,
  email: 'user@example.com',
  cargo: 'USER',
  iat: 0,
  exp: 0,
  aud: 'audience',
  iss: 'issuer',
};

const trilhaData: CreateTrilhaDTO = {
  nome: 'Cachoeira da Pavuna',
  cidade: 'Jundiaí',
  estado: 'São Paulo',
  distancia_m: 5000,
  passos: 6798,
  duracao_s: 3600,
  nota: 5,
  descricao: 'Trilha linda.',
  rota: [
    [
      [-23.1, -46.9],
      [-23.2, -46.8],
    ],
  ],
  compartilhada: true,
  iniciada_em: new Date(),
};

const fullTrilha = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  id_usuario: 1,
  compartilhada: false,
  rota: trilhaData.rota,
  autor: {
    nome_exibicao: 'Autor',
    nome_usuario: '@autor',
    foto_url: null,
    reputacao: 0,
  },
  fotos: [],
  tags: [],
  ...overrides,
});

describe('TrilhaService', () => {
  let service: TrilhaService;
  let prisma: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      $transaction: jest.fn((callback: any) => callback(prisma)),
      usuario: { findUnique: jest.fn(), findFirst: jest.fn() },
      tag: { findUnique: jest.fn(), create: jest.fn() },
      trilha: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrilhaService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadAzureService, useValue: UploadAzureServiceMock() },
      ],
    }).compile();

    service = module.get<TrilhaService>(TrilhaService);
    prisma.usuario.findUnique.mockResolvedValue({
      banido: false,
      bloqueado: false,
    });
  });

  it('creates a trail with its tags', async () => {
    prisma.tag.findUnique.mockResolvedValue(null);
    prisma.tag.create.mockResolvedValue({ id: 3 });
    prisma.trilha.create.mockResolvedValue({ id: 10 });
    prisma.trilha.findFirst.mockResolvedValue(fullTrilha());

    const result = await service.create_trilha(
      { ...trilhaData, tags: 'Cachoeira, mata' },
      token,
    );

    expect(result.statusCode).toEqual(201);
    const created = prisma.trilha.create.mock.calls[0][0].data;
    expect(created.id_usuario).toEqual(1);
    expect(created.tags.create).toHaveLength(2);
    expect(prisma.tag.create).toHaveBeenCalledWith({
      data: { descritivo: 'cachoeira' },
    });
  });

  it('rejects an invalid route', async () => {
    await expect(
      service.create_trilha({ ...trilhaData, rota: [[[-23.1]]] as any }, token),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.trilha.create).not.toHaveBeenCalled();
  });

  it('hides a non shared trail from other users', async () => {
    prisma.trilha.findFirst.mockResolvedValue(fullTrilha({ id_usuario: 2 }));

    await expect(service.get_trilha(10, token)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('shows the owner their own non shared trail', async () => {
    prisma.trilha.findFirst.mockResolvedValue(fullTrilha());

    const result = await service.get_trilha(10, token);

    expect(result.data).toMatchObject({ id: 10, dono: true });
    // Serialized as JSON, an undefined key is left out of the response.
    expect(JSON.parse(JSON.stringify(result.data))).not.toHaveProperty(
      'id_usuario',
    );
  });

  it('reduces the route of feed trails', async () => {
    const longSegment = Array.from({ length: 1000 }, (_, i) => [
      -23 + i / 1e4,
      -46,
    ]);
    prisma.trilha.findMany.mockResolvedValue([
      fullTrilha({ compartilhada: true, rota: [longSegment] }),
    ]);

    const result = await service.feed({});
    const rota = (result.data as any[])[0].rota;

    expect(rota[0].length).toBeLessThanOrEqual(151);
    expect(rota[0][rota[0].length - 1]).toEqual(
      longSegment[longSegment.length - 1],
    );
  });

  it('lists only the shared trails of another user', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 2 });
    prisma.trilha.findMany.mockResolvedValue([]);

    await service.user_trilhas('@outro', {});

    expect(prisma.trilha.findMany.mock.calls[0][0].where).toEqual({
      id_usuario: 2,
      compartilhada: true,
      deletedAt: null,
    });
  });

  it('fails for an unknown user', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(service.user_trilhas('@nada', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
