import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { FilesAzureService } from '../../common/services/file.azure.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [UserService, UploadAzureService, FilesAzureService],
  controllers: [UserController],
})
export class UserModule {}
