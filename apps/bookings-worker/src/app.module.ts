import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { BookingsProcessorModule } from './bookings-processor/bookings-processor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    BookingsProcessorModule,
  ],
  providers: [
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
export class AppModule {}
