import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { BookingsProcessorService } from './bookings-processor.service';
import type { BookingQueueMessage } from './booking-queue-message.interface';
import type { AppConfig } from '../config/configuration';

const BOOKINGS_QUEUE_KEY = 'bookings:queue';

@Injectable()
export class QueueConsumerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(QueueConsumerService.name);
  private isShuttingDown = false;
  private loopPromise: Promise<void> | null = null;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly bookingsProcessorService: BookingsProcessorService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  onApplicationBootstrap() {
    // Fire-and-track the consume loop; we don't await it here since it runs
    // for the lifetime of the process.
    this.loopPromise = this.runLoop();
  }

  async onApplicationShutdown() {
    this.isShuttingDown = true;
    // Give the current in-flight BRPOP/processMessage call a moment to wind
    // down cleanly before the process actually exits (k8s SIGTERM grace
    // period covers this in practice).
    if (this.loopPromise) {
      await Promise.race([
        this.loopPromise,
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    }
  }

  private async runLoop(): Promise<void> {
    const timeoutSeconds = this.configService.get('queuePollTimeoutSeconds', {
      infer: true,
    });
    this.logger.log(
      `Starting queue consumer loop (BRPOP timeout=${timeoutSeconds}s) on key "${BOOKINGS_QUEUE_KEY}"`,
    );

    while (!this.isShuttingDown) {
      try {
        // BRPOP blocks the connection for up to `timeoutSeconds` waiting for
        // an item, returning null on timeout so we can re-check
        // isShuttingDown periodically instead of blocking forever.
        const result = await this.redis.brpop(
          BOOKINGS_QUEUE_KEY,
          timeoutSeconds,
        );
        if (!result) continue; // timed out, no message - loop back and check shutdown flag

        const [, raw] = result;
        await this.handleRawMessage(raw);
      } catch (err) {
        const error = err as Error;
        this.logger.error(
          `Queue consumer loop error: ${error.message}`,
          error.stack,
        );
        // Brief backoff so a persistent Redis connectivity issue doesn't
        // spin the CPU in a tight error loop.
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    this.logger.log('Queue consumer loop exited cleanly');
  }

  private async handleRawMessage(raw: string): Promise<void> {
    let message: BookingQueueMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      this.logger.error(
        `Discarding unparseable queue message: ${raw.slice(0, 200)}`,
      );
      return;
    }

    try {
      await this.bookingsProcessorService.processMessage(message);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `Unhandled error processing booking ${message.bookingRef}: ${error.message}`,
        error.stack,
      );
      // Deliberately not re-thrown: processJob already persists retry state
      // to the BookingJob row, so a failure here doesn't lose the job - the
      // reconciliation sweep will pick it up on its next pass regardless.
    }
  }
}
