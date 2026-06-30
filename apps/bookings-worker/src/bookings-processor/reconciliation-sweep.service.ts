import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsProcessorService } from './bookings-processor.service';
import type { AppConfig } from '../config/configuration';

/**
 * Safety net for the at-least-once delivery gap inherent to "push to Redis,
 * also write a durable row": if the process crashes between the Postgres
 * write and the Redis LPUSH, or Redis itself restarts and loses its list,
 * the BookingJob row is the only remaining record that a job needs doing.
 * This sweep finds rows that are PENDING for too long, or stuck in
 * PROCESSING (a worker died mid-job), and re-runs them through the same
 * processJob() path the live consumer uses - so there is exactly one code
 * path for "do the work", just two ways of triggering it.
 */
@Injectable()
export class ReconciliationSweepService {
  private readonly logger = new Logger(ReconciliationSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsProcessorService: BookingsProcessorService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @Cron('*/30 * * * * *') // every 30 seconds; see RECONCILE_INTERVAL_MS in .env for the documented intent
  async sweep(): Promise<void> {
    const thresholdMs = this.configService.get('stuckJobThresholdMs', {
      infer: true,
    });
    const cutoff = new Date(Date.now() - thresholdMs);

    const stuckJobs = await this.prisma.bookingJob.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { lt: cutoff },
      },
      take: 25, // bounded batch per sweep so one sweep can't run unboundedly long
    });

    if (stuckJobs.length === 0) return;

    this.logger.warn(
      JSON.stringify({
        message: 'reconciliation sweep found stuck jobs',
        count: stuckJobs.length,
        job_ids: stuckJobs.map((j) => j.id),
      }),
    );

    for (const job of stuckJobs) {
      await this.bookingsProcessorService.processJob(job.id);
    }
  }
}
