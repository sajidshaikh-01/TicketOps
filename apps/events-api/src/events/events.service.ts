import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@ticketops/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { ListEventsQueryDto } from './dto/list-events-query.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListEventsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;

    const where: Prisma.EventWhereInput = {
      isPublished: true,
      ...(query.category && { category: query.category }),
      ...(query.city && { city: query.city }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          venue: true,
          city: true,
          startsAt: true,
          endsAt: true,
          bannerUrl: true,
          basePrice: true,
          totalSeats: true,
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, isPublished: true },
    });

    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    const seatCounts = await this.prisma.seat.groupBy({
      by: ['status'],
      where: { eventId: id },
      _count: { _all: true },
    });

    const availability = {
      available: 0,
      held: 0,
      booked: 0,
    };
    for (const row of seatCounts) {
      availability[row.status.toLowerCase() as keyof typeof availability] =
        row._count._all;
    }

    return { ...event, availability };
  }

  async getSeatMap(eventId: string) {
    await this.findOne(eventId); // 404s if event doesn't exist / isn't published

    const seats = await this.prisma.seat.findMany({
      where: { eventId },
      orderBy: [{ section: 'asc' }, { seatCode: 'asc' }],
      select: {
        id: true,
        seatCode: true,
        section: true,
        priceTier: true,
        status: true,
      },
    });

    return { eventId, seats };
  }

  async listCategories() {
    const rows = await this.prisma.event.findMany({
      where: { isPublished: true },
      distinct: ['category'],
      select: { category: true },
    });
    return rows.map((r) => r.category);
  }
}
