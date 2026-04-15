import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller.js';
import { ReviewService } from './review.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FileService } from '../../common/services/file.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ReviewController],
  providers: [ReviewService, FileService]
})
export class ReviewModule {}
