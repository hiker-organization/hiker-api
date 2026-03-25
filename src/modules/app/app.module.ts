import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from '../user/user.module.js';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';

@Module({
  imports: [
      UserModule, 
      ServeStaticModule.forRoot({
        rootPath: join(__dirname, '..', '..', '..', 'imgs'), serveRoot: '/fotos'
      }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
