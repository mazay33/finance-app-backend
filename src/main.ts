import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DecimalTransformerInterceptor } from './common/interceptors';

async function start() {
  const PORT = process.env.PORT || 5000;
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3333', 'http://localhost:4000', 'http://localhost:4001'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe(
    { transform: true, }
  ));
  app.useGlobalInterceptors(new DecimalTransformerInterceptor());

  const config = new DocumentBuilder()
    .setTitle('finance-app')
    .setDescription('Документация REST API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document);

  await app.listen(PORT, () => console.log(`Server started on port = ${PORT}`));
}

start();
