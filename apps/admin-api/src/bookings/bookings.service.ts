import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { JwtPayload } from '../auth/jwt-payload.interface';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListBookingsQueryDto, requester: JwtPayload) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    // ORGANIZERs only see bookings for events they own; ADMIN sees everything.
    const eventScope =
      requester.role === 'ADMIN'
        ? {}
        : { event: { organizerId: requester.sub } };

    const where = {
      ...eventScope,
      ...(query.status && { status: query.status }),
      ...(query.eventId && { eventId: query.eventId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          event: { select: { title: true, organizerId: true } },
          seats: {
            include: { seat: { select: { seatCode: true, section: true } } },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, requester: JwtPayload) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            title: true,
            organizerId: true,
            venue: true,
            city: true,
            startsAt: true,
          },
        },
        seats: {
          include: { seat: { select: { seatCode: true, section: true } } },
        },
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    this.assertCanManage(booking.event.organizerId, requester);
    return booking;
  }

  async cancel(id: string, requester: JwtPayload) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { event: true, seats: true },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    this.assertCanManage(booking.event.organizerId, requester);

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.seat.updateMany({
        where: { id: { in: booking.seats.map((s) => s.seatId) } },
        data: { status: 'AVAILABLE' },
      });
    });

    return { message: 'Booking cancelled by admin/organizer' };
  }

  // Powers the admin dashboard: totals, breakdown by status, and the
  // event-level resolution metrics called out in the original brief.
  async getDashboardStats(requester: JwtPayload) {
    const eventScope =
      requester.role === 'ADMIN' ? {} : { organizerId: requester.sub };

    const events = await this.prisma.event.findMany({
      where: eventScope,
      select: { id: true },
    });
    const eventIds = events.map((e) => e.id);

    const [totalTickets, statusCounts, totalRevenue] = await Promise.all([
      this.prisma.bookingSeat.count({
        where: { booking: { eventId: { in: eventIds } } },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { eventId: { in: eventIds } },
        _count: { _all: true },
      }),
      this.prisma.booking.aggregate({
        where: { eventId: { in: eventIds }, status: 'CONFIRMED' },
        _sum: { totalAmount: true },
      }),
    ]);

    const byStatus: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      FAILED: 0,
    };
    for (const row of statusCounts) {
      byStatus[row.status] = row._count._all;
    }

    return {
      totalEvents: eventIds.length,
      totalTicketsSold: totalTickets,
      totalRevenue: totalRevenue._sum.totalAmount ?? 0,
      bookings: {
        total: Object.values(byStatus).reduce((a, b) => a + b, 0),
        pending: byStatus.PENDING,
        confirmed: byStatus.CONFIRMED,
        cancelled: byStatus.CANCELLED,
        failed: byStatus.FAILED,
      },
    };
  }

  private assertCanManage(eventOrganizerId: string, requester: JwtPayload) {
    if (requester.role === 'ADMIN') return;
    if (requester.role === 'ORGANIZER' && requester.sub === eventOrganizerId)
      return;
    throw new ForbiddenException(
      'You do not have permission to manage this booking',
    );
  }
}
