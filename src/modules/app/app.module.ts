import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from '../user/user.module.js';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { AuthModule } from '../auth/auth.module.js';
import { ReviewModule } from '../review/review.module.js';

@Module({
  imports: [
    UserModule,
    AuthModule,
    ReviewModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'imgs'),
      serveRoot: '/imgs',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
