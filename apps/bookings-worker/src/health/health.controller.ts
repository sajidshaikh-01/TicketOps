import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // Liveness: is the worker process up.
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'bookings-worker',
      timestamp: new Date().toISOString(),
    };
  }

  // Readiness: can the worker actually do its job (reach DB + Redis).
  @Get('ready')
  async ready() {
    const checks: Record<string, 'ok' | 'down'> = {
      database: 'ok',
      redis: 'ok',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.database = 'down';
    }

    try {
      await this.redis.ping();
    } catch {
      checks.redis = 'down';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');
    if (!allOk) {
      throw new ServiceUnavailableException({ status: 'not_ready', checks });
    }

    return { status: 'ready', checks };
  }
}
