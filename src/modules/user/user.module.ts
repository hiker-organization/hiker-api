import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { FilesAzureService } from '../../common/services/file.azure.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { CommonModule } from '../../common/common.module.js';
import { UserValidator } from './validator/user.validator.js';

@Module({
  imports: [PrismaModule, AuthModule, CommonModule],
  providers: [
    UserService,
    UploadAzureService,
    FilesAzureService,
    UserValidator,
  ],
  controllers: [UserController],
})
export class UserModule {}
