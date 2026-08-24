import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from '../user/user.module.js';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { AuthModule } from '../auth/auth.module.js';
import { ReviewModule } from '../review/review.module.js';
import { days, hours, minutes, seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    UserModule,
    AuthModule,
    ReviewModule,
    ThrottlerModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'imgs'),
      serveRoot: '/imgs',
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'global',
          ttl: days(1),
          limit: 500,
          blockDuration: hours(12)
        },
        {
          name: 'auth',
          ttl: seconds(30),
          limit: 5,
          blockDuration: minutes(15)
        }
      ],
      errorMessage: 'Limite de tentativas excedido. Por favor, tente novamente mais tarde.',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule {}
