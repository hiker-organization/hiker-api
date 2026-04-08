import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './config/jwt.constants.js';
import { EmailService } from '../../common/services/email.service.js';
import { HashingService } from '../../common/services/hash.service.js';
import { BcryptService } from '../../common/services/bcript.service.js';

@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: {
        expiresIn: jwtConstants.jwtTtl,
        audience: jwtConstants.audience,
        issuer: jwtConstants.issuer,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: HashingService,
      useClass: BcryptService,
    },
    EmailService,
    AuthService,
  ],
  exports: [HashingService, EmailService],
})
export class AuthModule {}
