// o projeto roda jest em modo ESM, onde os globais não são injetados
import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from '@jest/globals';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { PayloadDTO } from './dto/payload.dto.js';

// GET /auth/web/me é a checagem de sessão do hiker-manager: o cargo devolvido
// precisa ser o do token, o mesmo que o RolesGuard das rotas de admin confere.
describe('AuthController — /auth/web/me', () => {
  let app: INestApplication;
  const payload = { sub: 7, email: 'admin@hiker.com', cargo: 'ADM' };
  const verifyAsync = jest.fn<(token: string) => Promise<unknown>>();
  const findUnique = jest.fn<(args: unknown) => Promise<unknown>>();
  const getUserImageUrl = jest.fn<(blobName: string) => Promise<string>>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            web_me: (token: PayloadDTO) =>
              AuthService.prototype.web_me.call(
                {
                  prisma: { usuario: { findUnique } },
                  uploadAzureService: { getUserImageUrl },
                },
                token,
              ),
          },
        },
        { provide: JwtService, useValue: { verifyAsync } },
        { provide: PrismaService, useValue: { usuario: { findUnique } } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    verifyAsync.mockReset().mockResolvedValue(payload);
    findUnique
      .mockReset()
      .mockResolvedValue({ id: 7, banido: false, foto_url: null });
    getUserImageUrl
      .mockReset()
      .mockImplementation((blobName) =>
        Promise.resolve(`https://blob/${blobName}?sas`),
      );
  });

  it('devolve o id, o e-mail e o cargo do token, sem foto quando não há', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/web/me')
      .set('Authorization', 'Bearer token-valido')
      .expect(200);

    expect(response.body).toEqual({
      message: 'Sessão ativa.',
      data: { id: 7, email: 'admin@hiker.com', cargo: 'ADM', foto_url: null },
    });
    expect(getUserImageUrl).not.toHaveBeenCalled();
  });

  it('devolve a foto de perfil como URL assinada', async () => {
    findUnique.mockResolvedValue({
      id: 7,
      banido: false,
      foto_url: 'perfil/7.jpg',
    });

    const response = await request(app.getHttpServer())
      .get('/auth/web/me')
      .set('Authorization', 'Bearer token-valido')
      .expect(200);

    expect(getUserImageUrl).toHaveBeenCalledWith('perfil/7.jpg');
    const body = response.body as { data: { foto_url: string | null } };
    expect(body.data.foto_url).toBe('https://blob/perfil/7.jpg?sas');
  });

  it('responde 401 sem token', async () => {
    await request(app.getHttpServer()).get('/auth/web/me').expect(401);
  });

  it('responde 401 para usuário banido', async () => {
    findUnique.mockResolvedValue({ id: 7, banido: true });

    await request(app.getHttpServer())
      .get('/auth/web/me')
      .set('Authorization', 'Bearer token-valido')
      .expect(401);
  });
});
