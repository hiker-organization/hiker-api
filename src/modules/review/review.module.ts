import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LocalModule } from '../local/local.module.js';
import { UploadAzureService } from '../../common/services/upload.azure.service.js';
import { FilesAzureService } from '../../common/services/file.azure.service.js';
import { CommonModule } from '../../common/common.module.js';
import { ReviewValidator } from './validator/review.validator.js';

@Module({
  imports: [AuthModule, PrismaModule, LocalModule, CommonModule],
  controllers: [ReviewController],
  providers: [
    ReviewService,
    UploadAzureService,
    FilesAzureService,
    ReviewValidator,
  ],
})
export class ReviewModule {}
