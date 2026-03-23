import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties that are not in the DTO.
      forbidNonWhitelisted: true, // Throw an error if a non-whitelisted property is found in the request body.
      transform: true, // Transform the request body to the DTO type.
    }),
  );

  const config = new DocumentBuilder() 
    .setTitle('Qashio API')
    .setDescription('Simple Expense Tracker API')// TODO: add a description of the API.
    .setVersion('0.0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
