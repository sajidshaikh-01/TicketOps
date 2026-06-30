import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { buildWinstonOptions } from './common/logger/winston.config';
import type { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(
      buildWinstonOptions(process.env.NODE_ENV || 'development'),
    ),
  });

  const configService = app.get(ConfigService<AppConfig, true>);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableCors({
    origin: configService.get('corsOrigin', { infer: true }),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TicketOps - Admin API')
    .setDescription(
      'Authentication, JWT issuance, and event/booking management for ADMIN and ORGANIZER roles',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  const port = configService.get('port', { infer: true });
  await app.listen(port);

  Logger.log(`admin-api listening on port ${port}`, 'Bootstrap');
  Logger.log(`Swagger docs available at /api/docs`, 'Bootstrap');
}

bootstrap();
