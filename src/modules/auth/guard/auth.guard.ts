import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { REQUEST_TOKEN_PAYLOAD } from '../utils/constants/auth.constant.js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AuthToken implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extract_token(request);

    if (!token) throw new UnauthorizedException('token não encontrado.');
    let payload;

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch (error) {
      throw new UnauthorizedException('Acesso não autorizado.');
    }

    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });
    if (user?.banido || !user || user.deletedAt)
      throw new UnauthorizedException('Você não pode realizar esta ação.');
    request[REQUEST_TOKEN_PAYLOAD] = payload;

    return true;
  }

  private extract_token(req: Request) {
    const authorization = req.headers?.authorization;
    if (authorization) {
      const [type, token] = authorization.split(' ');
      if (type === 'Bearer' && token) return token;
    }
    return req.cookies?.access_token;
  }
}
