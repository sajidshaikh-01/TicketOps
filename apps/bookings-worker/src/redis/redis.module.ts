import { Global, Module, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import type { AppConfig } from '../config/configuration';

const logger = new Logger('RedisModule');

// Provides a single shared ioredis connection across the app, configured
// from AppConfig. Using a provider token (rather than importing a singleton
// module-level client) keeps this testable — tests can mock REDIS_CLIENT.
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const redis = new Redis({
          host: config.get('redis.host', { infer: true }),
          port: config.get('redis.port', { infer: true }),
          password: config.get('redis.password', { infer: true }),
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        });

        redis.on('connect', () => logger.log('Connected to Redis'));
        redis.on('error', (err) => logger.error(`Redis error: ${err.message}`));

        return redis;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor() {}

  async onApplicationShutdown() {
    logger.log('Redis module shutting down');
  }
}
