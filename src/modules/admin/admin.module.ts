import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminValidator } from './utils/validator/admin.validator.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminValidator],
  imports: [AuthModule, PrismaModule],
})
export class AdminModule {}
