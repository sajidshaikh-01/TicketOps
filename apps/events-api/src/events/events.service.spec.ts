import { NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListEventsQueryDto } from './dto/list-events-query.dto';

// Only the Prisma delegate methods EventsService actually calls need to be
// mocked. Casting through `unknown` keeps this decoupled from the full
// generated PrismaClient surface (which isn't available at typecheck time
// unless `prisma generate` has run).
function createMockPrisma() {
  return {
    event: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    seat: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService & {
    event: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
    };
    seat: {
      groupBy: jest.Mock;
      findMany: jest.Mock;
    };
  };
}

describe('EventsService', () => {
  let service: EventsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new EventsService(prisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('applies default pagination and only queries published events', async () => {
      prisma.event.findMany.mockResolvedValue([{ id: 'evt-1' }]);
      prisma.event.count.mockResolvedValue(1);

      const result = await service.findAll({} as ListEventsQueryDto);

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true },
          skip: 0,
          take: 12,
        }),
      );
      expect(result).toEqual({
        items: [{ id: 'evt-1' }],
        page: 1,
        pageSize: 12,
        total: 1,
        totalPages: 1,
      });
    });

    it('merges category, city, and search filters into the where clause', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);

      await service.findAll({
        category: 'Music',
        city: 'Pune',
        search: 'jazz',
        page: 2,
        pageSize: 5,
      } as ListEventsQueryDto);

      const callArgs = prisma.event.findMany.mock.calls[0][0];
      expect(callArgs.where).toEqual(
        expect.objectContaining({
          isPublished: true,
          category: 'Music',
          city: 'Pune',
          OR: [
            { title: { contains: 'jazz', mode: 'insensitive' } },
            { description: { contains: 'jazz', mode: 'insensitive' } },
          ],
        }),
      );
      expect(callArgs.skip).toBe(5); // (page 2 - 1) * pageSize 5
      expect(callArgs.take).toBe(5);
    });
  });

  describe('findOne', () => {
    it('returns the event with an availability breakdown by seat status', async () => {
      prisma.event.findFirst.mockResolvedValue({
        id: 'evt-1',
        title: 'Jazz Night',
      });
      prisma.seat.groupBy.mockResolvedValue([
        { status: 'AVAILABLE', _count: { _all: 40 } },
        { status: 'HELD', _count: { _all: 3 } },
        { status: 'BOOKED', _count: { _all: 7 } },
      ]);

      const result = await service.findOne('evt-1');

      expect(result).toEqual({
        id: 'evt-1',
        title: 'Jazz Night',
        availability: { available: 40, held: 3, booked: 7 },
      });
    });

    it('throws NotFoundException when the event does not exist or is unpublished', async () => {
      prisma.event.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.seat.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('getSeatMap', () => {
    it('returns the seat list for a published event', async () => {
      prisma.event.findFirst.mockResolvedValue({ id: 'evt-1' });
      prisma.seat.groupBy.mockResolvedValue([]);
      prisma.seat.findMany.mockResolvedValue([
        { id: 'seat-1', seatCode: 'A1', section: 'GENERAL' },
      ]);

      const result = await service.getSeatMap('evt-1');

      expect(prisma.seat.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { eventId: 'evt-1' } }),
      );
      expect(result).toEqual({
        eventId: 'evt-1',
        seats: [{ id: 'seat-1', seatCode: 'A1', section: 'GENERAL' }],
      });
    });

    it('propagates the 404 from findOne when the event does not exist', async () => {
      prisma.event.findFirst.mockResolvedValue(null);

      await expect(service.getSeatMap('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.seat.findMany).not.toHaveBeenCalled();
    });
  });

  describe('listCategories', () => {
    it('returns a flat list of distinct category strings', async () => {
      prisma.event.findMany.mockResolvedValue([
        { category: 'Music' },
        { category: 'Comedy' },
      ]);

      const result = await service.listCategories();

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true },
          distinct: ['category'],
        }),
      );
      expect(result).toEqual(['Music', 'Comedy']);
    });
  });
});
