import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import * as cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';

import { WinstonModule } from 'nest-winston';
import { transports, format } from 'winston';


const port = process.env.PORT || 5000;


async function bootstrap() {
  require('dotenv').config();
  //const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create(AppModule, {
      cors: true,
      logger: WinstonModule.createLogger({
        transports: [
       // let's log errors into its own file
          new transports.File({
            filename: `logs/error.log`,
            level: 'error',
            format: format.combine(format.timestamp(), format.json()),
          }),
          // logging all level
          new transports.File({
            filename: `logs/combined.log`,
            format: format.combine(format.timestamp(), format.json()),
          }),
          // we also want to see logs in our console
          new transports.Console({
           format: format.combine(
             format.cli(),
             format.splat(),
             format.timestamp(),
             format.printf((info) => {
               return `${info.timestamp} ${info.level}: ${info.message}`;
             }),
            ),
        }),
        ],
      }),
    }
    );

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
    origin: ['http://antofanari-001-site6.gtempurl.com', 'http://localhost:3000', 'http://antofanari-001-site3.gtempurl.com']
  });


  await app.listen(port);
}
bootstrap();
