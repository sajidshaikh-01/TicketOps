import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Gauge } from 'prom-client';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

const BOOKINGS_QUEUE_KEY = 'bookings:queue';

/**
 * Polls the Redis list length for the bookings queue and publishes it as a
 * gauge, so we have a real backlog signal for Grafana/alerting and, later,
 * queue-depth-based HPA. Deliberately a separate cheap LLEN poll rather than
 * piggybacking on the BRPOP consumer loop, since that loop only ever knows
 * about the single item it just popped - not how many are left behind it.
 */
@Injectable()
export class QueueDepthMetricService {
  private readonly logger = new Logger(QueueDepthMetricService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectMetric('booking_queue_depth')
    private readonly queueDepthGauge: Gauge<string>,
  ) {}

  @Cron('*/10 * * * * *') // every 10 seconds
  async poll(): Promise<void> {
    try {
      const depth = await this.redis.llen(BOOKINGS_QUEUE_KEY);
      this.queueDepthGauge.set(depth);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `Failed to poll queue depth: ${error.message}`,
        error.stack,
      );
      // Deliberately not re-thrown: a transient Redis blip here shouldn't
      // crash the worker, it just means one missed scrape data point.
    }
  }
}
