import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HashingService } from '../../common/services/hash.service.js';
import { EmailService } from '../../common/services/email.service.js';
import { AuthValidator } from './utils/validator/auth.validator.js';
import { GoogleAuthService } from './utils/google/google-auth.service.js';
import { UserValidator } from '../user/validator/user.validator.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';

const google = {
  google_id: 'g-123',
  email: 'ana@gmail.com',
  nome: 'Ana Souza',
  foto: 'https://lh3.googleusercontent.com/a/foto',
};

const signupFields = {
  nome_usuario: 'ana',
  nome_exibicao: 'Ana',
  senha: 'Senha@123',
  numero_celular: '11999999999',
  data_nascimento: new Date('2000-01-01'),
};

describe('AuthService — login com Google', () => {
  let service: AuthService;
  let prisma: any;
  let authValidator: any;
  let userValidator: any;
  let upload: any;
  const verify = jest.fn<(idToken: string) => Promise<typeof google>>();
  const fetchMock = jest.fn<typeof fetch>();
  const originalFetch = global.fetch;

  beforeEach(async () => {
    jest.clearAllMocks();
    verify.mockResolvedValue(google);
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    prisma = {
      usuario: {
        findFirst: jest.fn(),
        create: jest.fn((args: any) =>
          Promise.resolve({ id: 7, cargo: 'USER', ...args.data }),
        ),
        update: jest.fn(),
      },
      token_refresh: { deleteMany: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(() => Promise.resolve([])),
    };
    authValidator = {
      verify_ban: jest.fn(),
      generateRefreshToken: () => 'refresh',
      hashToken: () => 'hash',
    };
    userValidator = {
      numero_is_equal_fail: jest.fn(),
      nick_empty_or_fail: jest.fn(),
      find_user_or_fail: jest.fn(),
    };
    upload = { addImageUser: jest.fn(() => Promise.resolve('user-1.jpg')) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: HashingService, useValue: { hash: () => 'senha-hash' } },
        { provide: JwtService, useValue: new JwtService({ secret: 'test' }) },
        { provide: EmailService, useValue: {} },
        { provide: AuthValidator, useValue: authValidator },
        { provide: GoogleAuthService, useValue: { verify } },
        { provide: UserValidator, useValue: userValidator },
        { provide: UploadAzureService, useValue: upload },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('enters a linked account without the password', async () => {
    prisma.usuario.findFirst.mockResolvedValueOnce({
      id: 1,
      cargo: 'USER',
      email: 'ana@gmail.com',
    });

    const result: any = await service.login_google({ id_token: 't' });

    expect(result.access_token).toEqual(expect.any(String));
    expect(result.refresh_token).toEqual('refresh');
    expect(authValidator.verify_ban).toHaveBeenCalledWith('ana@gmail.com');
  });

  it('asks the password when the email has an account not linked', async () => {
    prisma.usuario.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1 });

    await expect(service.login_google({ id_token: 't' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('signs up a new account with the fields and the password typed', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    const login: any = await service.login_google({ id_token: 't' });
    expect(login).toMatchObject({
      needs_signup: true,
      email: 'ana@gmail.com',
      nome_exibicao: 'Ana Souza',
    });

    const result: any = await service.register_google({
      ...signupFields,
      signup_token: login.signup_token,
    });

    expect(result.statusCode).toEqual(201);
    expect(result.access_token).toEqual(expect.any(String));
    expect(prisma.usuario.create.mock.calls[0][0].data).toMatchObject({
      nome_usuario: '@ana',
      email: 'ana@gmail.com',
      senha: 'senha-hash',
      google_id: 'g-123',
      foto_url: 'user-1.jpg',
    });
  });

  it('signs up without the photo when it cannot be downloaded', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);
    fetchMock.mockResolvedValue(new Response('erro', { status: 500 }));
    const login: any = await service.login_google({ id_token: 't' });

    await service.register_google({
      ...signupFields,
      signup_token: login.signup_token,
    });

    expect(prisma.usuario.create.mock.calls[0][0].data.foto_url).toBeNull();
  });

  it('rejects a signup_token that is not ours', async () => {
    const forged = await new JwtService({ secret: 'other' }).signAsync(google);

    await expect(
      service.register_google({ ...signupFields, signup_token: forged }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it('links Google and fills an empty profile photo', async () => {
    userValidator.find_user_or_fail.mockResolvedValue({
      id: 1,
      google_id: null,
      foto_url: null,
    });
    prisma.usuario.findFirst.mockResolvedValue(null);

    await service.link_google({ id_token: 't' }, { sub: 1 } as any);

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { google_id: 'g-123', foto_url: 'user-1.jpg' },
    });
  });

  it('keeps the photo the user already chose', async () => {
    userValidator.find_user_or_fail.mockResolvedValue({
      id: 1,
      google_id: null,
      foto_url: 'escolhida.jpg',
    });
    prisma.usuario.findFirst.mockResolvedValue(null);

    await service.link_google({ id_token: 't' }, { sub: 1 } as any);

    expect(prisma.usuario.update.mock.calls[0][0].data).toEqual({
      google_id: 'g-123',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not link a Google account of another user', async () => {
    userValidator.find_user_or_fail.mockResolvedValue({
      id: 1,
      google_id: null,
      foto_url: null,
    });
    prisma.usuario.findFirst.mockResolvedValue({ id: 2 });

    await expect(
      service.link_google({ id_token: 't' }, { sub: 1 } as any),
    ).rejects.toThrow(ConflictException);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });
});
