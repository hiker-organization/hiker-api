import { Module } from '@nestjs/common';
import { LocalController } from './local.controller.js';
import { LocalService } from './local.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [LocalController],
  providers: [LocalService],
  exports: [LocalService],
})
export class LocalModule {}
