import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { buildWinstonOptions } from './common/logger/winston.config';
import type { AppConfig } from './config/configuration';

// bookings-worker is a background processor, not a public API, but it still
// boots as a (minimal) Nest HTTP application purely to expose /health and
// /ready for Kubernetes liveness/readiness probes in later phases. All the
// real work happens in QueueConsumerService and ReconciliationSweepService,
// which start themselves via Nest's application lifecycle hooks.
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(
      buildWinstonOptions(process.env.NODE_ENV || 'development'),
    ),
  });

  const configService = app.get(ConfigService<AppConfig, true>);
  app.enableShutdownHooks();

  const port = configService.get('port', { infer: true });
  await app.listen(port);

  Logger.log(
    `bookings-worker listening on port ${port} (health/ready only)`,
    'Bootstrap',
  );
}

bootstrap();
