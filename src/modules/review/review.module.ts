import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { FilesAzureService } from '../../common/services/file.azure.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ReviewController],
  providers: [ReviewService, UploadAzureService, FilesAzureService],
})
export class ReviewModule {}
