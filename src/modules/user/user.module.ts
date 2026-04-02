import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { fileService } from '../../common/services/file.service.js';
import { HashingService } from '../auth/hashing/hashing.service.js';
import { BcryptService } from '../auth/hashing/bcript.service.js';

@Module({
  imports: [PrismaModule],
  providers: [
    UserService,
    fileService,
    { provide: HashingService, useClass: BcryptService },
  ],
  controllers: [UserController],
})
export class UserModule {}
