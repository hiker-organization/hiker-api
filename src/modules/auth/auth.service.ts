import {
  BadRequestException,
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
import { randomInt } from 'node:crypto';
import { HashingService } from '../../common/services/hash.service.js';
import { login_response } from '../../common/helpers/login-response.helper.js';
import { message_response } from '../../common/helpers/message-response.helper.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashingService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}
  async login(loginDto: LoginDTO) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: loginDto.email },
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
      email: user.email,
    });

    return login_response('logado com sucesso.', accessToken, HttpStatus.OK);
  }

  async forgot_password(forgotPasswordDto: ForgotPasswordDTO) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: forgotPasswordDto.email },
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
        data: {
          token,
          expira_em: expiresAt,
          id_usuario: user.id,
        },
      })
    ]);

    await this.emailService.sendPasswordResetEmail(user.email, token);

    return message_response(
      'Se existir uma conta com esse email, um link de recuperação será enviado.',
      HttpStatus.OK,
    );
  }

  async reset_password(resetPasswordDto: ResetPasswordDTO) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: resetPasswordDto.email },
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
