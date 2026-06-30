import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
  ],
})
export class BookingsProcessorModule {}
