import * as dotenv from 'dotenv';
dotenv.config(); //

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);// Amplía el límite global para JSON y datos de formularios
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  // 🚀 Habilitar validaciones automatizadas a nivel global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve automáticamente propiedades del body que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza un error si el cliente envía campos no permitidos
      transform: true, // Transforma automáticamente los payloads a los tipos de los DTOs
    }),
  );
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
