import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // Liveness: "is the process up". Kept dependency-free on purpose — k8s
  // should restart the pod only if the process itself is wedged, not
  // because a downstream dependency is briefly unavailable.
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe - process is up' })
  health() {
    return {
      status: 'ok',
      service: 'events-api',
      timestamp: new Date().toISOString(),
    };
  }

  // Readiness: "can this pod actually serve traffic". Checks the real
  // dependencies (DB, Redis) so k8s can pull a pod out of the Service's
  // endpoint list during a DB outage without killing the pod outright.
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe - dependencies are reachable' })
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
