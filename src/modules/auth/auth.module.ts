import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './config/jwt.constants.js';
import { EmailService } from '../../common/services/email.service.js';
import { HashingService } from '../../common/services/hash.service.js';
import { BcryptService } from '../../common/services/bcript.service.js';
import { AuthValidator } from './utils/validator/auth.validator.js';
import { GoogleAuthService } from './utils/google/google-auth.service.js';
import { UserValidator } from '../user/validator/user.validator.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { FilesAzureService } from '../../common/services/file.azure.service.js';
import { CommonModule } from '../../common/common.module.js';

@Global()
@Module({
  imports: [
    PrismaModule,
    CommonModule,
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
    AuthValidator,
    GoogleAuthService,
    UserValidator,
    UploadAzureService,
    FilesAzureService,
  ],
  exports: [HashingService, EmailService],
})
export class AuthModule {}
