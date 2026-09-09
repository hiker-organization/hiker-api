import {
  BadRequestException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDTO } from './dto/login.dto.js';
import { RefreshTokenDTO } from './dto/refresh-token.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../common/services/email.service.js';
import { ForgotPasswordDTO } from './dto/forgot-password.dto.js';
import { ResetPasswordDTO } from './dto/reset-password.dto.js';
import { randomInt, randomBytes, createHash } from 'node:crypto';
import { HashingService } from '../../common/services/hash.service.js';
import { login_response } from '../../common/helpers/login-response.helper.js';
import { message_response } from '../../common/helpers/message-response.helper.js';
import { jwtConstants } from './config/jwt.constants.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashingService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(loginDto: LoginDTO) {
    const user = await this.prisma.usuario.findFirst({
      where: { email: loginDto.email, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    const senhaIsValid = await this.hashService.compare(
      loginDto.password,
      user.senha,
    );

    if (!senhaIsValid) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      cargo: user.cargo,
      email: user.email,
    });

    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);
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

    return login_response(
      'logado com sucesso.',
      accessToken,
      refreshToken,
      HttpStatus.OK,
    );
  }

  async refresh(refreshTokenDto: RefreshTokenDTO) {
    const tokenHash = this.hashToken(refreshTokenDto.refresh_token);

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
    });

    const newRefreshToken = this.generateRefreshToken();
    const newTokenHash = this.hashToken(newRefreshToken);
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

  async logout(refreshTokenDto: RefreshTokenDTO) {
    const tokenHash = this.hashToken(refreshTokenDto.refresh_token);
    await this.prisma.token_refresh.deleteMany({
      where: { token_hash: tokenHash },
    });
    return message_response('Logout realizado com sucesso.', HttpStatus.OK);
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

  async reset_password(resetPasswordDto: ResetPasswordDTO) {
    const user = await this.prisma.usuario.findFirst({
      where: { email: resetPasswordDto.email, deletedAt: null },
    });

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const token = await this.prisma.token_redefinicao_senha.findFirst({
      where: { token: resetPasswordDto.token, id_usuario: user.id },
    });

    if (!token || token.expira_em < new Date()) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

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
