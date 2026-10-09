import { Module } from '@nestjs/common';
import { PrismaModule } from '../modules/prisma/prisma.module.js';
import { GlobalValidator } from './validators/global.validator.js';

@Module({
  imports: [PrismaModule],
  providers: [GlobalValidator],
  exports: [GlobalValidator],
})
export class CommonModule {}
