import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtPayload } from '../auth/jwt-payload.interface';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto, organizer: JwtPayload) {
    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    const seatRows = this.buildSeatRows(dto.sections);

    return this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        venue: dto.venue,
        city: dto.city,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        bannerUrl: dto.bannerUrl,
        basePrice: dto.basePrice,
        totalSeats: seatRows.length,
        organizerId: organizer.sub,
        seats: { create: seatRows },
      },
      include: { _count: { select: { seats: true } } },
    });
  }

  async findAll(requester: JwtPayload) {
    // ADMIN sees every event (including unpublished drafts from any
    // organizer); ORGANIZER sees only their own events, published or not.
    const where =
      requester.role === 'ADMIN' ? {} : { organizerId: requester.sub };
    return this.prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { seats: true, bookings: true } } },
    });
  }

  async findOne(id: string, requester: JwtPayload) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    this.assertCanManage(event.organizerId, requester);
    return event;
  }

  async update(id: string, dto: UpdateEventDto, requester: JwtPayload) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    this.assertCanManage(event.organizerId, requester);

    if (
      dto.startsAt &&
      dto.endsAt &&
      new Date(dto.endsAt) <= new Date(dto.startsAt)
    ) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async remove(id: string, requester: JwtPayload) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    this.assertCanManage(event.organizerId, requester);

    const bookingCount = await this.prisma.booking.count({
      where: { eventId: id, status: { in: ['PENDING', 'CONFIRMED'] } },
    });
    if (bookingCount > 0) {
      throw new BadRequestException(
        `Cannot delete event with ${bookingCount} active booking(s). Cancel them first or unpublish instead.`,
      );
    }

    await this.prisma.event.delete({ where: { id } });
    return { message: 'Event deleted successfully' };
  }

  async publish(id: string, requester: JwtPayload) {
    return this.setPublishState(id, true, requester);
  }

  async unpublish(id: string, requester: JwtPayload) {
    return this.setPublishState(id, false, requester);
  }

  // --- helpers -------------------------------------------------------------

  private async setPublishState(
    id: string,
    isPublished: boolean,
    requester: JwtPayload,
  ) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    this.assertCanManage(event.organizerId, requester);
    return this.prisma.event.update({ where: { id }, data: { isPublished } });
  }

  private assertCanManage(eventOrganizerId: string, requester: JwtPayload) {
    if (requester.role === 'ADMIN') return;
    if (requester.role === 'ORGANIZER' && requester.sub === eventOrganizerId)
      return;
    throw new ForbiddenException(
      'You do not have permission to manage this event',
    );
  }

  private buildSeatRows(sections: CreateEventDto['sections']) {
    const rows: { seatCode: string; section: string; priceTier: number }[] = [];
    for (const section of sections) {
      for (let r = 0; r < section.rows; r++) {
        const rowLetter = String.fromCharCode(65 + r);
        for (let s = 1; s <= section.seatsPerRow; s++) {
          rows.push({
            seatCode: `${section.name[0]}${rowLetter}${s}`,
            section: section.name,
            priceTier: section.priceTier,
          });
        }
      }
    }
    return rows;
  }
}
