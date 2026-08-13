import {
  Inject,
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { SeatStatus } from '@ticketops/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { SeatLockService } from './seat-lock.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { context, propagation } from '@opentelemetry/api';

const BOOKINGS_QUEUE_KEY = 'bookings:queue';
const CONVENIENCE_FEE_MULTIPLIER = 1.05; // 5% convenience fee, matches reference app

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seatLockService: SeatLockService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async createBooking(
    dto: CreateBookingDto,
    user: JwtPayload | undefined,
    requestId?: string,
  ) {
    const { eventId, seatCodes, customerName, customerEmail } = dto;
    const uniqueSeatCodes = [...new Set(seatCodes)];

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, isPublished: true },
    });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const seats = await this.prisma.seat.findMany({
      where: { eventId, seatCode: { in: uniqueSeatCodes } },
    });
    if (seats.length !== uniqueSeatCodes.length) {
      const foundCodes = new Set(seats.map((s) => s.seatCode));
      const missing = uniqueSeatCodes.filter((c) => !foundCodes.has(c));
      throw new BadRequestException(
        `Unknown seat codes for this event: ${missing.join(', ')}`,
      );
    }

    const unavailable = seats.filter((s) => s.status !== SeatStatus.AVAILABLE);
    if (unavailable.length > 0) {
      throw new ConflictException({
        message: 'One or more seats are already taken or held',
        seats: unavailable.map((s) => s.seatCode),
      });
    }

    // Step 1: acquire atomic Redis locks for every seat. This is the
    // linchpin against double-booking under concurrent requests — two users
    // clicking "book" on the same seat at the same instant will race here,
    // and only one SETNX can win.
    const holderToken = uuidv4();
    const lockResult = await this.seatLockService.acquireLocks(
      eventId,
      uniqueSeatCodes,
      holderToken,
    );
    if (lockResult.success === false) {
      const conflicts: string[] = lockResult.conflicts;
      throw new ConflictException({
        message: `Seat ${conflicts[0]} is currently held by another customer`,
        seats: conflicts,
      });
    }

    try {
      const bookingRef = this.generateBookingRef();
      const totalAmount =
        seats.reduce(
          (sum, seat) => sum + Number(event.basePrice) * Number(seat.priceTier),
          0,
        ) * CONVENIENCE_FEE_MULTIPLIER;

      // Step 2: persist booking + seat updates atomically. If this
      // transaction fails for any reason, the Redis locks we took above
      // still expire naturally via TTL, so a crash here can never
      // permanently strand a seat.
      const { booking, bookingJobId } = await this.prisma.$transaction(
        async (tx) => {
          const created = await tx.booking.create({
            data: {
              bookingRef,
              eventId,
              userId: user?.sub,
              customerName,
              customerEmail,
              totalAmount,
              status: 'PENDING',
              seats: {
                create: seats.map((seat) => ({
                  seatId: seat.id,
                  priceAtBooking:
                    Number(event.basePrice) * Number(seat.priceTier),
                })),
              },
            },
            include: { seats: { include: { seat: true } } },
          });

          await tx.seat.updateMany({
            where: { id: { in: seats.map((s) => s.id) } },
            data: { status: SeatStatus.BOOKED },
          });

          const job = await tx.bookingJob.create({
            data: { bookingId: created.id, status: 'PENDING' },
          });

          return { booking: created, bookingJobId: job.id };
        },
      );

      // Step 3: push to the Redis list for the worker to pick up immediately.
      // The BookingJob row created above is the durable fallback: if Redis
      // restarts and this message is lost, the worker's reconciliation
      // sweep (see bookings-worker) will still find and process the job.
      const traceContext: Record<string, string> = {};
      propagation.inject(context.active(), traceContext);

      await this.redis.lpush(
        BOOKINGS_QUEUE_KEY,
        JSON.stringify({
          jobId: bookingJobId,
          bookingId: booking.id,
          bookingRef: booking.bookingRef,
          eventTitle: event.title,
          customerName,
          customerEmail,
          seatCodes: uniqueSeatCodes,
          requestId,
          traceContext,
        }),
      );

      this.logger.log(
        JSON.stringify({
          message: 'booking created',
          request_id: requestId,
          booking_ref: booking.bookingRef,
          event_id: eventId,
          seats: uniqueSeatCodes,
        }),
      );

      return booking;
    } catch (err) {
      // Roll back the Redis locks we took if persistence failed, so the
      // seats become bookable again immediately rather than waiting for TTL.
      await this.seatLockService.releaseLocks(eventId, uniqueSeatCodes);
      throw err;
    }
  }

  async getByRef(bookingRef: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingRef },
      include: {
        event: {
          select: { title: true, venue: true, city: true, startsAt: true },
        },
        seats: {
          include: { seat: { select: { seatCode: true, section: true } } },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingRef} not found`);
    }
    return booking;
  }

  async getMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            title: true,
            venue: true,
            city: true,
            startsAt: true,
            bannerUrl: true,
          },
        },
        seats: {
          include: { seat: { select: { seatCode: true, section: true } } },
        },
      },
    });
  }

  async cancelBooking(bookingRef: string, requestId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingRef },
      include: { seats: { include: { seat: true } } },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingRef} not found`);
    }
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
      });
      await tx.seat.updateMany({
        where: { id: { in: booking.seats.map((bs) => bs.seatId) } },
        data: { status: SeatStatus.AVAILABLE },
      });
    });

    // Defensive cleanup: locks should already be gone by now (booking only
    // reaches here after the booking job completed), but if the worker
    // crashed mid-flight before clearing them, this guarantees release.
    await this.seatLockService.releaseLocks(
      booking.eventId,
      booking.seats.map((bs) => bs.seat.seatCode),
    );

    this.logger.log(
      JSON.stringify({
        message: 'booking cancelled',
        request_id: requestId,
        booking_ref: bookingRef,
      }),
    );

    return { message: 'Booking cancelled successfully' };
  }

  private generateBookingRef(): string {
    const numeric = Math.floor(100000 + Math.random() * 900000);
    return `TKT-${numeric}`;
  }
}
