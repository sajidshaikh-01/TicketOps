import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@ticketops/prisma';

// Wraps the generated Prisma client in a Nest-managed, injectable service.
// Hooking into onModuleInit/onModuleDestroy ensures we connect once at
// startup and disconnect cleanly on shutdown (important for graceful pod
// termination in Kubernetes later on).
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL via Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }
}
