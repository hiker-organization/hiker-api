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
import { ValidationPipe, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

/**
 * O handler de /auth/refresh recebia `@Body() refreshToken: string`, mas @Body()
 * sem nome de propriedade injeta o corpo inteiro — um objeto. O service repassava
 * esse objeto para createHash().update(), que só aceita string/Buffer, e a
 * requisição morria antes de qualquer consulta ao banco. Estes testes fixam o
 * contrato: o service tem de receber a string do token.
 */
describe('AuthController — contrato de /auth/refresh e /auth/logout', () => {
  let app: INestApplication;
  const refresh = jest.fn<(token: string) => Promise<unknown>>();
  const logout = jest.fn<(token: string) => Promise<unknown>>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { refresh, logout } }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    refresh.mockReset().mockResolvedValue({ ok: true });
    logout.mockReset().mockResolvedValue({ ok: true });
  });

  it('entrega ao service a string do refresh token, não o objeto do corpo', async () => {
    const token = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: token })
      .expect(201);

    expect(refresh).toHaveBeenCalledWith(token);
    expect(typeof refresh.mock.calls[0][0]).toBe('string');
  });

  it('o mesmo vale para /auth/logout', async () => {
    const token = 'ffffffffffffffffffffffffffffffff';

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refresh_token: token })
      .expect(201);

    expect(logout).toHaveBeenCalledWith(token);
    expect(typeof logout.mock.calls[0][0]).toBe('string');
  });

  it('rejeita corpo sem refresh_token em vez de chamar o service', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({})
      .expect(400);

    expect(refresh).not.toHaveBeenCalled();
  });
});
