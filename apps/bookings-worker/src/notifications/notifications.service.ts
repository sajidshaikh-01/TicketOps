import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface BookingConfirmationContext {
  bookingId: string;
  bookingRef: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  seatCodes: string[];
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phase 1 has no real mail transport (per the project roadmap - Email/
   * Slack/Teams delivery is a future phase), so "sending" means: write a
   * Notification row with the rendered content and mark it SENT. This keeps
   * the contract identical to what a real provider integration will need
   * later (subject, body, recipient, channel, status) so swapping in
   * SendGrid/SES in a future phase only touches this one method.
   */
  async sendBookingConfirmation(
    ctx: BookingConfirmationContext,
  ): Promise<void> {
    const subject = `Your tickets for ${ctx.eventTitle} - ${ctx.bookingRef}`;
    const body = [
      `Hi ${ctx.customerName},`,
      ``,
      `Your booking is confirmed!`,
      ``,
      `Booking reference: ${ctx.bookingRef}`,
      `Event: ${ctx.eventTitle}`,
      `Seats: ${ctx.seatCodes.join(', ')}`,
      ``,
      `See you there!`,
    ].join('\n');

    await this.prisma.notification.create({
      data: {
        bookingId: ctx.bookingId,
        channel: 'EMAIL',
        recipient: ctx.customerEmail,
        subject,
        body,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    this.logger.log(
      JSON.stringify({
        message: 'booking confirmation notification recorded',
        booking_ref: ctx.bookingRef,
        recipient: ctx.customerEmail,
      }),
    );
  }

  async sendFailureNotice(
    bookingRef: string,
    customerEmail: string,
    reason: string,
  ): Promise<void> {
    this.logger.warn(
      JSON.stringify({
        message: 'booking failed - no confirmation sent',
        booking_ref: bookingRef,
        reason,
      }),
    );
    // Intentionally not persisted as a Notification: a failed booking
    // doesn't need a customer-facing "FAILED" email recorded in the same
    // table that powers a future notification feed; the BookingJob.lastError
    // column already captures this for operators.
    void customerEmail;
  }
}
