import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { BookingsProcessorService } from './bookings-processor.service';
import { QueueConsumerService } from './queue-consumer.service';
import { ReconciliationSweepService } from './reconciliation-sweep.service';
import { SeatLockReleaseService } from './seat-lock-release.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  providers: [
    BookingsProcessorService,
    QueueConsumerService,
    ReconciliationSweepService,
    SeatLockReleaseService,
    makeCounterProvider({
      name: 'booking_jobs_processed_total',
      help: 'Total number of booking job processing attempts',
      labelNames: ['status'],
    }),
    makeCounterProvider({
      name: 'booking_jobs_failed_permanently_total',
      help: 'Total number of booking jobs that exhausted max attempts and were marked FAILED',
    }),
    makeHistogramProvider({
      name: 'booking_job_processing_duration_seconds',
      help: 'Booking job processing duration in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    }),
    makeGaugeProvider({
      name: 'booking_jobs_active',
      help: 'Number of booking jobs currently being processed',
    }),
  ],
})
export class BookingsProcessorModule {}
