import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDTO } from './dto/login.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../common/services/email.service.js';
import { ForgotPasswordDTO } from './dto/forgot-password.dto.js';
import { ResetPasswordDTO } from './dto/reset-password.dto.js';
import { VerifyResetCodeDTO } from './dto/verify-reset-code.dto.js';
import { randomInt } from 'node:crypto';
import { HashingService } from '../../common/services/hash.service.js';
import { login_response } from '../../common/helpers/login-response.helper.js';
import { message_response } from '../../common/helpers/message-response.helper.js';
import { jwtConstants } from './config/jwt.constants.js';
import { Response, Request } from 'express';
import { AuthValidator } from './utils/validator/auth.validator.js';
import { GoogleAuthService } from './utils/google/google-auth.service.js';
import { GoogleLoginDTO } from './dto/google-login.dto.js';
import { GoogleRegisterDTO } from './dto/google-register.dto.js';
import { PayloadDTO } from './dto/payload.dto.js';
import { UserValidator } from '../user/validator/user.validator.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';

type GoogleSignupPayload = {
  google_id: string;
  email: string;
  nome: string | null;
  foto: string | null;
};

// The signup_token is signed with its own secret and audience, so it can never be used
// as an access token.
const GOOGLE_SIGNUP_SECRET = () => `${jwtConstants.secret}:google-signup`;
const GOOGLE_SIGNUP_AUDIENCE = 'google-signup';
const GOOGLE_SIGNUP_TTL = 15 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashingService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private authValidator: AuthValidator,
    private readonly googleAuth: GoogleAuthService,
    private readonly userValidator: UserValidator,
    private readonly uploadAzureService: UploadAzureService,
  ) {}

  async login(loginDto: LoginDTO) {
    const user = await this.authValidator.login_logical(loginDto);
    return this.issue_tokens(user, 'logado com sucesso.', HttpStatus.OK);
  }

  // Accounts linked to Google (by the Google sign-up or from the profile) enter without
  // the password. An account with the same email but not linked has to sign in with the
  // password first and link Google on the profile; without an account, the app asks the
  // fields Google doesn't give and calls register_google with the signup_token.
  async login_google(data: GoogleLoginDTO) {
    const google = await this.googleAuth.verify(data.id_token);

    const linked = await this.prisma.usuario.findFirst({
      where: { google_id: google.google_id, deletedAt: null },
    });
    if (linked) {
      await this.authValidator.verify_ban(linked.email);
      return this.issue_tokens(linked, 'logado com sucesso.', HttpStatus.OK);
    }

    if (await this.find_by_email(google.email)) {
      throw new ConflictException(
        'Já existe uma conta com este email. Entre com sua senha e vincule sua conta Google no perfil.',
      );
    }

    const signupToken = await this.jwtService.signAsync(
      {
        google_id: google.google_id,
        email: google.email,
        nome: google.nome,
        foto: google.foto,
      },
      {
        secret: GOOGLE_SIGNUP_SECRET(),
        audience: GOOGLE_SIGNUP_AUDIENCE,
        expiresIn: GOOGLE_SIGNUP_TTL,
      },
    );

    return {
      message: 'Complete seu cadastro para continuar.',
      needs_signup: true,
      signup_token: signupToken,
      email: google.email,
      nome_exibicao: google.nome,
      foto_url: google.foto,
      statusCode: HttpStatus.OK,
    };
  }

  async register_google(data: GoogleRegisterDTO) {
    let google: GoogleSignupPayload;
    try {
      google = await this.jwtService.verifyAsync<GoogleSignupPayload>(
        data.signup_token,
        { secret: GOOGLE_SIGNUP_SECRET(), audience: GOOGLE_SIGNUP_AUDIENCE },
      );
    } catch {
      throw new BadRequestException(
        'Cadastro com Google expirado, entre com o Google novamente.',
      );
    }

    const linked = await this.prisma.usuario.findFirst({
      where: { google_id: google.google_id, deletedAt: null },
    });
    if (linked) {
      throw new ConflictException(
        'Esta conta Google já tem cadastro. Entre com o Google.',
      );
    }
    if (await this.find_by_email(google.email)) {
      throw new ConflictException('Email já existente.');
    }

    const nick = `@${data.nome_usuario}`;
    await this.userValidator.numero_is_equal_fail(data.numero_celular);
    await this.userValidator.nick_empty_or_fail(nick);

    const user = await this.prisma.usuario.create({
      data: {
        nome_usuario: nick,
        nome_exibicao: data.nome_exibicao,
        email: google.email,
        senha: await this.hashService.hash(data.senha),
        numero_celular: data.numero_celular,
        data_nascimento: data.data_nascimento,
        google_id: google.google_id,
        foto_url: google.foto
          ? await this.save_google_photo(google.foto)
          : null,
      },
    });

    return this.issue_tokens(user, 'Cadastro concluído.', HttpStatus.CREATED);
  }

  // Lets an account created with the password enter with Google from then on.
  async link_google(data: GoogleLoginDTO, token: PayloadDTO) {
    const google = await this.googleAuth.verify(data.id_token);
    const user = await this.userValidator.find_user_or_fail(token.sub);

    if (user.google_id === google.google_id) {
      return message_response('Sua conta Google já está vinculada.', 200);
    }
    if (user.google_id) {
      throw new ConflictException(
        'Sua conta já está vinculada a outra conta Google.',
      );
    }
    const other = await this.prisma.usuario.findFirst({
      where: { google_id: google.google_id, deletedAt: null },
    });
    if (other) {
      throw new ConflictException(
        'Esta conta Google já está vinculada a outro usuário.',
      );
    }

    // The Google photo only fills an empty profile photo, never replaces a chosen one.
    const foto_url =
      !user.foto_url && google.foto
        ? await this.save_google_photo(google.foto)
        : null;

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { google_id: google.google_id, ...(foto_url && { foto_url }) },
    });
    return message_response('Conta Google vinculada com sucesso.', 200);
  }

  private find_by_email(email: string) {
    return this.prisma.usuario.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
      select: { id: true },
    });
  }

  // The profile photo of the Google account, copied to our storage like an uploaded one.
  // Without it the account is still created.
  private async save_google_photo(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      return await this.uploadAzureService.addImageUser(buffer, 'google.jpg');
    } catch {
      return null;
    }
  }

  private async issue_tokens(
    user: { id: number; cargo: string; email: string },
    message: string,
    status: HttpStatus,
  ) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      cargo: user.cargo,
      email: user.email,
    });

    const refreshToken = this.authValidator.generateRefreshToken();
    const tokenHash = this.authValidator.hashToken(refreshToken);
    const expiresAt = new Date(
      Date.now() + jwtConstants.refreshTokenTtl * 1000,
    );

    // Single-session policy: new login invalidates all previous refresh tokens for this user.
    await this.prisma.$transaction([
      this.prisma.token_refresh.deleteMany({ where: { id_usuario: user.id } }),
      this.prisma.token_refresh.create({
        data: {
          token_hash: tokenHash,
          expira_em: expiresAt,
          id_usuario: user.id,
        },
      }),
    ]);

    return login_response(message, accessToken, refreshToken, status);
  }

  async login_web(loginDto: LoginDTO, res: Response) {
    const tokens = await this.login(loginDto);

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    return message_response('Logado com sucesso', 200);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.authValidator.hashToken(refreshToken);

    const stored = await this.prisma.token_refresh.findUnique({
      where: { token_hash: tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    if (stored.expira_em < new Date()) {
      await this.prisma.token_refresh.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token expirado.');
    }

    // Note: user lookup is outside the rotation transaction — a tight concurrent race with
    // the same token could produce a second rotation. Acceptable for this use case.
    const user = await this.prisma.usuario.findUnique({
      where: { id: stored.id_usuario },
    });

    if (!user || user.deletedAt) {
      await this.prisma.token_refresh.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const newAccessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      cargo: user.cargo,
    });

    const newRefreshToken = this.authValidator.generateRefreshToken();
    const newTokenHash = this.authValidator.hashToken(newRefreshToken);
    const expiresAt = new Date(
      Date.now() + jwtConstants.refreshTokenTtl * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.token_refresh.delete({ where: { id: stored.id } }),
      this.prisma.token_refresh.create({
        data: {
          token_hash: newTokenHash,
          expira_em: expiresAt,
          id_usuario: user.id,
        },
      }),
    ]);

    return login_response(
      'token renovado com sucesso.',
      newAccessToken,
      newRefreshToken,
      HttpStatus.OK,
    );
  }

  async refresh_web(res: Response, req: Request) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken)
      throw new UnauthorizedException('Refresh token não encontrado.');

    const tokens = await this.refresh(refreshToken);

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    return message_response('Token renovado com sucesso.', 200);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.authValidator.hashToken(refreshToken);
    await this.prisma.token_refresh.deleteMany({
      where: { token_hash: tokenHash },
    });
    return message_response('Logout realizado com sucesso.', HttpStatus.OK);
  }

  async logout_web(res: Response, req: Request) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.logout(refreshToken);
    }
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

    return message_response('Logout realizado com sucesso.', 200);
  }

  async forgot_password(forgotPasswordDto: ForgotPasswordDTO) {
    const user = await this.prisma.usuario.findFirst({
      where: { email: forgotPasswordDto.email, deletedAt: null },
    });

    if (!user) {
      return message_response(
        'Se existir uma conta com esse email, um link de recuperação será enviado.',
        HttpStatus.OK,
      );
    }

    const token = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    await this.prisma.$transaction([
      this.prisma.token_redefinicao_senha.deleteMany({
        where: { id_usuario: user.id },
      }),
      this.prisma.token_redefinicao_senha.create({
        data: { token, expira_em: expiresAt, id_usuario: user.id },
      }),
    ]);

    await this.emailService.sendPasswordResetEmail(user.email, token);

    return message_response(
      'Se existir uma conta com esse email, um link de recuperação será enviado.',
      HttpStatus.OK,
    );
  }

  async verify_reset_code(verifyResetCodeDto: VerifyResetCodeDTO) {
    await this.authValidator.findValidResetToken(
      verifyResetCodeDto.email,
      verifyResetCodeDto.token,
    );
    return message_response('Código válido.', HttpStatus.OK);
  }

  async reset_password(resetPasswordDto: ResetPasswordDTO) {
    const { user, resetToken: token } =
      await this.authValidator.findValidResetToken(
        resetPasswordDto.email,
        resetPasswordDto.token,
      );

    const senhaHash = await this.hashService.hash(resetPasswordDto.senha);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: user.id },
        data: { senha: senhaHash },
      }),
      this.prisma.token_redefinicao_senha.delete({
        where: { id: token.id },
      }),
    ]);

    return message_response('Senha redefinida com sucesso!', HttpStatus.OK);
  }
}
