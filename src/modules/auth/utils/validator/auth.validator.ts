import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { LoginDTO } from '../../dto/login.dto.js';
import { HashingService } from '../../../../common/services/hash.service.js';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class AuthValidator {
  constructor(
    private prisma: PrismaService,
    private readonly hashService: HashingService,
  ) {}
  async verify_ban(email: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: email },
    });

    if (user!.banido)
      throw new UnauthorizedException(
        'Você foi banido, não poderá mais usar nosso app.',
      );
  }

  async login_logical(data: LoginDTO) {
    const user = await this.prisma.usuario.findFirst({
      where: { email: data.email, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    await this.verify_ban(user.email);

    const senhaIsValid = await this.hashService.compare(
      data.password,
      user.senha,
    );

    if (!senhaIsValid) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    return user;
  }

  async findValidResetToken(email: string, token: string) {
    const user = await this.prisma.usuario.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const resetToken = await this.prisma.token_redefinicao_senha.findFirst({
      where: { token, id_usuario: user.id },
    });

    if (!resetToken || resetToken.expira_em < new Date()) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    return { user, resetToken };
  }

  public generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  public hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
