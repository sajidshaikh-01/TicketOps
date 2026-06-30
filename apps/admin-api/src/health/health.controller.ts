import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: "is the process up". Dependency-free on purpose - k8s should
  // restart the pod only if the process itself is wedged.
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe - process is up' })
  health() {
    return {
      status: 'ok',
      service: 'admin-api',
      timestamp: new Date().toISOString(),
    };
  }

  // Readiness: "can this pod actually serve traffic". admin-api's only hard
  // dependency is Postgres (no Redis here), so that's the only check.
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe - database is reachable' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', checks: { database: 'ok' } };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks: { database: 'down' },
      });
    }
  }
}
