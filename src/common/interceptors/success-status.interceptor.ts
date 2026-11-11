// success-status.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs';

@Injectable()
export class SuccessStatusInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();

    const statusCode =
      this.reflector.getAllAndOverride<number>(HTTP_CODE_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? (request.method === 'POST' ? 201 : 200);

    return next.handle().pipe(
      map((data) => {
        if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
          return { ...data, statusCode };
        }
        return { statusCode, data };
      }),
    );
  }
}
