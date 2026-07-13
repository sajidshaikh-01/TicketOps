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
      whitelist: true, // strips properties not declared in the DTO
      forbidNonWhitelisted: true, // rejects requests with unknown properties
      transform: true, // auto-converts payloads to DTO instances (enables @Type())
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableCors({
    origin: configService.get('corsOrigin', { infer: true }),
    credentials: true,
  });

  app.setGlobalPrefix('api/admin', {
    exclude: ['metrics'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TicketOps - Admin API')
    .setDescription(
      'Administrative operations: user management, event management, and booking oversight',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Lets Nest call onModuleDestroy/onApplicationShutdown hooks (e.g.
  // PrismaService disconnecting cleanly) when k8s sends SIGTERM during a
  // rolling deploy, instead of the process being killed mid-request.
  app.enableShutdownHooks();

  const port = configService.get('port', { infer: true });
  await app.listen(port);

  Logger.log(`events-api listening on port ${port}`, 'Bootstrap');
  Logger.log(`Swagger docs available at /api/docs`, 'Bootstrap');
}

bootstrap();