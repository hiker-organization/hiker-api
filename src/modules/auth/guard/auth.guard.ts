import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { REQUEST_TOKEN_PAYLOAD } from '../utils/constants/auth.constant.js';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthToken implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extract_token(request);
    if (!token) throw new UnauthorizedException('token não encontrado.');

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request[REQUEST_TOKEN_PAYLOAD] = payload;
    } catch (error) {
      throw new UnauthorizedException(`Acesso não autorizado.`);
    }

    return true;
  }

  private extract_token(req: Request) {
    const authorization = req.headers?.authorization;
    if (!authorization || typeof authorization != 'string') return;
    return authorization.split(' ')[1];
  }
}
