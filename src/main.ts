import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // contexto: aqui, o nest vai lançar erro automaticamente caso algum campo da body não estiver
  // dentro do esperado do DTO.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
