import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter, Histogram, Gauge } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QrCodeService } from '../notifications/qrcode.service';
import { SeatLockReleaseService } from './seat-lock-release.service';
import type { BookingQueueMessage } from './booking-queue-message.interface';
import type { AppConfig } from '../config/configuration';

@Injectable()
export class BookingsProcessorService {
  private readonly logger = new Logger(BookingsProcessorService.name);
  private readonly maxAttempts: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly qrCodeService: QrCodeService,
    private readonly seatLockReleaseService: SeatLockReleaseService,
    private readonly configService: ConfigService<AppConfig, true>,
    @InjectMetric('booking_jobs_processed_total')
    private readonly jobsProcessedCounter: Counter<string>,
    @InjectMetric('booking_jobs_failed_permanently_total')
    private readonly jobsFailedPermanentlyCounter: Counter<string>,
    @InjectMetric('booking_job_processing_duration_seconds')
    private readonly processingDurationHistogram: Histogram<string>,
    @InjectMetric('booking_jobs_active')
    private readonly activeJobsGauge: Gauge<string>,
  ) {
    this.maxAttempts = this.configService.get('maxJobAttempts', {
      infer: true,
    });
  }

  /**
   * Processes one booking job end-to-end: generate QR, record the
   * confirmation notification, mark the booking CONFIRMED, mark the
   * BookingJob DONE, and release the now-redundant Redis seat lock.
   *
   * Idempotent by design: if this runs twice for the same booking (e.g. the
   * reconciliation sweep picks up a job that the live consumer was also
   * mid-way through), re-confirming an already-CONFIRMED booking and
   * re-deleting an already-deleted Redis key are both safe no-ops.
   */
  async processMessage(message: BookingQueueMessage): Promise<void> {
    const job = await this.prisma.bookingJob.findUnique({
      where: { id: message.jobId },
    });
    if (!job) {
      this.logger.warn(
        `No BookingJob found for id ${message.jobId}; skipping (already cleaned up?)`,
      );
      return;
    }
    await this.processJob(job.id);
  }

  /**
   * Loads a BookingJob fresh from the database by ID and processes it. This
   * is the form the reconciliation sweep uses, since it discovers job IDs
   * by querying the database directly rather than from a queue message.
   */
  async processJob(jobId: string): Promise<void> {
    const job = await this.prisma.bookingJob.findUnique({
      where: { id: jobId },
      include: {
        booking: {
          include: {
            event: { select: { id: true, title: true } },
            seats: { include: { seat: { select: { seatCode: true } } } },
          },
        },
      },
    });

    if (!job) {
      this.logger.warn(`processJob: job ${jobId} no longer exists`);
      return;
    }

    if (job.status === 'DONE') {
      return; // already processed, nothing to do
    }

    if (job.attempts >= this.maxAttempts) {
      this.logger.error(
        `Job ${jobId} exceeded max attempts (${this.maxAttempts}); marking FAILED and leaving for manual review`,
      );
      await this.prisma.bookingJob.update({
        where: { id: job.id },
        data: { status: 'FAILED' },
      });
      await this.prisma.booking.update({
        where: { id: job.bookingId },
        data: { status: 'FAILED' },
      });
      this.jobsFailedPermanentlyCounter.inc();
      this.jobsProcessedCounter.labels('failed').inc();
      return;
    }

    await this.prisma.bookingJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });

    const booking = job.booking;
    const seatCodes = booking.seats.map((bs) => bs.seat.seatCode);

    this.activeJobsGauge.inc();
    const endTimer = this.processingDurationHistogram.startTimer();
    let status: 'success' | 'failed' = 'success';

    try {
      const qrCodeUrl = await this.qrCodeService.generateForBooking(
        booking.bookingRef,
      );

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED', qrCodeUrl: qrCodeUrl ?? undefined },
      });

      await this.notificationsService.sendBookingConfirmation({
        bookingId: booking.id,
        bookingRef: booking.bookingRef,
        eventTitle: booking.event.title,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        seatCodes,
      });

      // The seat is already marked BOOKED in Postgres (done synchronously by
      // events-api at booking creation) - the Redis key was only ever a
      // short-lived guard against a *concurrent* booking attempt, so it's
      // safe and correct to free it now rather than waiting for its TTL.
      await this.seatLockReleaseService.release(booking.event.id, seatCodes);

      await this.prisma.bookingJob.update({
        where: { id: job.id },
        data: { status: 'DONE', processedAt: new Date() },
      });

      this.logger.log(
        JSON.stringify({
          message: 'booking job completed',
          booking_ref: booking.bookingRef,
          attempts: job.attempts + 1,
        }),
      );
    } catch (err) {
      status = 'failed';
      const error = err as Error;
      this.logger.error(
        `Job ${jobId} failed on attempt ${job.attempts + 1}: ${error.message}`,
        error.stack,
      );

      await this.prisma.bookingJob.update({
        where: { id: job.id },
        data: { status: 'PENDING', lastError: error.message }, // PENDING so it's retried, not stuck in PROCESSING
      });

      await this.notificationsService.sendFailureNotice(
        booking.bookingRef,
        booking.customerEmail,
        error.message,
      );
    } finally {
      this.jobsProcessedCounter.labels(status).inc();
      endTimer();
      this.activeJobsGauge.dec();
    }
  }
}
