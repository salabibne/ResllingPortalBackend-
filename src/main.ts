import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';

/**
 * Optional base path for every route, e.g. BASE_PATH=/backend when the API
 * shares a domain with the frontend:
 *   https://example.com/          -> frontend
 *   https://example.com/backend/  -> this API (/backend/auth/login, ...)
 * Empty (the default) keeps all routes at the root, as in local development.
 */
function readBasePath(): string {
  const trimmed = (process.env.BASE_PATH ?? '').trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '';
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const basePath = readBasePath();

  if (basePath) {
    // Some hosts (cPanel / Passenger) strip the app's sub-path before the
    // request reaches Node and others pass it through. Accept both by adding
    // the base path back when it is missing.
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const url = req.url;
      const hasBasePath =
        url === basePath ||
        url.startsWith(`${basePath}/`) ||
        url.startsWith(`${basePath}?`);
      if (!hasBasePath) {
        req.url = `${basePath}${url}`;
      }
      next();
    });
    app.setGlobalPrefix(basePath.slice(1));
  }

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: `${basePath}/uploads/`,
    maxAge: '7d',
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
