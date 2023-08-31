import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import * as cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';
const port = process.env.PORT || 5000;


async function bootstrap() {
  require('dotenv').config();
  //const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create(AppModule, { cors: true });

  // Configurar la carpeta "public" como directorio estático para servir los archivos React
  console.log("join: ", join(__dirname, '..', 'public'));
  app.use(express.static(join(__dirname, '..', 'public')));

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: ['http://antofanari-001-site3.gtempurl.com']
  });


  await app.listen(port);
}
bootstrap();
