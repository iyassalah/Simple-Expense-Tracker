import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

function resolveCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (raw) {
    const parts = raw.split(',').map((o) => o.trim()).filter(Boolean);
    if (parts.length === 0) {
      return false;
    }
    return parts.length === 1 ? parts[0] : parts;
  }
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:4000',
  ];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: resolveCorsOrigin(),
    credentials: true,
  });

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
    .setDescription(
      'Simple Expense Tracker API. Use POST /auth/login or /auth/register for accessToken; refresh token is an httpOnly cookie — use the web app or POST /auth/refresh with credentials.',
    )
    .setVersion('0.0.1')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
