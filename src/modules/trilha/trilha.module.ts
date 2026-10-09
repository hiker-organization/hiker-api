import { Module } from '@nestjs/common';
import { TrilhaController } from './trilha.controller.js';
import { TrilhaService } from './trilha.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LocalModule } from '../local/local.module.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { FilesAzureService } from '../../common/services/file.azure.service.js';
import { CommonModule } from '../../common/common.module.js';
import { TrilhaValidator } from './utils/validator/trilha.validator.js';

@Module({
  imports: [AuthModule, PrismaModule, LocalModule, CommonModule],
  controllers: [TrilhaController],
  providers: [
    TrilhaService,
    UploadAzureService,
    FilesAzureService,
    TrilhaValidator,
  ],
})
export class TrilhaModule {}
