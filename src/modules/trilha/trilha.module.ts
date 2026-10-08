import { Module } from '@nestjs/common';
import { TrilhaController } from './trilha.controller.js';
import { TrilhaService } from './trilha.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LocalModule } from '../local/local.module.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { FilesAzureService } from '../../common/services/file.azure.service.js';

@Module({
  imports: [AuthModule, PrismaModule, LocalModule],
  controllers: [TrilhaController],
  providers: [TrilhaService, UploadAzureService, FilesAzureService],
})
export class TrilhaModule {}
