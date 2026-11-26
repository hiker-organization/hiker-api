// o projeto roda jest em modo ESM, onde os globais não são injetados
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDTO } from './dto/login.dto.js';
import { jwtConstants } from './config/jwt.constants.js';

// Os cookies do hiker-manager precisam de maxAge: sem ele, o navegador os descarta ao
// fechar e a sessão acaba antes do refresh token vencer.
describe('AuthService — cookies da sessão web', () => {
  const tokens = { access_token: 'access', refresh_token: 'refresh' };
  const cookie = jest.fn();
  const res = { cookie } as unknown as Response;

  // Só o necessário para os métodos testados, com o helper de cookies original.
  const service = {
    login: jest.fn(() => Promise.resolve(tokens)),
    refresh: jest.fn<(refreshToken: string) => Promise<typeof tokens>>(() =>
      Promise.resolve(tokens),
    ),
    set_auth_cookies: (
      AuthService.prototype as unknown as {
        set_auth_cookies: (r: Response, t: typeof tokens) => void;
      }
    ).set_auth_cookies,
  };

  const expectCookies = () => {
    expect(cookie).toHaveBeenCalledWith(
      'access_token',
      'access',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: jwtConstants.jwtTtl * 1000,
      }),
    );
    expect(cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: jwtConstants.refreshTokenTtl * 1000,
      }),
    );
  };

  beforeEach(() => {
    cookie.mockReset();
  });

  it('o login grava os cookies com a validade de cada token', async () => {
    await AuthService.prototype.login_web.call(
      service,
      { email: 'admin@hiker.com', password: 'senha' } as LoginDTO,
      res,
    );

    expectCookies();
  });

  it('o refresh regrava os cookies com a validade de cada token', async () => {
    const req = {
      cookies: { refresh_token: 'refresh-antigo' },
    } as unknown as Request;

    await AuthService.prototype.refresh_web.call(service, res, req);

    expect(service.refresh).toHaveBeenCalledWith('refresh-antigo');
    expectCookies();
  });
});
