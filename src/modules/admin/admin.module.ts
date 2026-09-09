import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports:[AuthModule, PrismaModule]
})
export class AdminModule {}
