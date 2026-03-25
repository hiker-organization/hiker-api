import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { fileService } from '../../common/services/file.service.js';
import { bcryptService } from '../../common/services/bcript.service.js';
import { hashingService } from '../../common/services/hash.service.js';

@Module({
  imports: [PrismaModule],
  providers: [UserService, fileService, { provide: hashingService, useClass: bcryptService }],
  controllers: [UserController]
})
export class UserModule {}
