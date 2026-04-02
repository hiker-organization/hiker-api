import { BadRequestException, Injectable, UnauthorizedException} from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HashingService } from './hashing/hashing.service.js';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../common/services/email.service.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { createHash, randomBytes } from 'node:crypto';
import { create_response } from '../../common/helpers/createResponse.helper.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashingService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    const senha_is_valid = await this.hashService.compare(
      loginDto.password,
      user.senha,
    );

    if (!senha_is_valid) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      message: 'login realizado com sucesso!',
      accessToken,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      return create_response(
        'Se existir uma conta com esse email, um link de recuperação será enviado.',
        null,
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    await this.prisma.token_redefinicao_senha.deleteMany({
      where: { id_usuario: user.id },
    });

    await this.prisma.token_redefinicao_senha.create({
      data: {
        id: tokenHash,
        expira_em: expiresAt,
        id_usuario: user.id,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL;
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.emailService.sendPasswordResetEmail(user.email, resetLink);

    return create_response(
      'Se existir uma conta com esse email, um link de recuperação será enviado.',
      null,
    );
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(resetPasswordDto.token);

    const token = await this.prisma.token_redefinicao_senha.findUnique({
      where: { id: tokenHash },
      include: { usuario: true },
    });

    if (!token || token.expira_em < new Date()) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const senhaHash = await this.hashService.hash(resetPasswordDto.senha);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: token.id_usuario },
        data: { senha: senhaHash },
      }),
      this.prisma.token_redefinicao_senha.delete({
        where: { id: token.id },
      }),
    ]);

    return create_response('Senha redefinida com sucesso!', null);
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
