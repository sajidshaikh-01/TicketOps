import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { Role } from '@ticketops/prisma';

function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const safeUser = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'CUSTOMER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new UsersService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns the user when found', async () => {
      prisma.user.findUnique.mockResolvedValue(safeUser);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(safeUser);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('updates only the fields provided in the dto', async () => {
      prisma.user.update.mockResolvedValue({
        ...safeUser,
        fullName: 'Updated Name',
      });

      const result = await service.updateProfile('user-1', {
        fullName: 'Updated Name',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { fullName: 'Updated Name' },
        }),
      );
      expect(result.fullName).toBe('Updated Name');
    });
  });

  describe('findAll', () => {
    it('paginates with defaults and no role filter when none is given', async () => {
      prisma.user.findMany.mockResolvedValue([safeUser]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({} as ListUsersQueryDto);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 20 }),
      );
      expect(result).toEqual({
        items: [safeUser],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('filters by role when provided', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll({ role: Role.ORGANIZER } as ListUsersQueryDto);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: Role.ORGANIZER } }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException with the id in the message when missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        'User missing-id not found',
      );
    });
  });

  describe('adminUpdate', () => {
    it('checks the user exists first, then applies the admin update', async () => {
      prisma.user.findUnique.mockResolvedValue(safeUser); // used by findOne()
      prisma.user.update.mockResolvedValue({
        ...safeUser,
        role: 'ORGANIZER',
        isActive: false,
      });

      const result = await service.adminUpdate('user-1', {
        role: Role.ORGANIZER,
        isActive: false,
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { role: Role.ORGANIZER, isActive: false },
        }),
      );
      expect(result.role).toBe('ORGANIZER');
    });

    it('propagates the 404 from findOne without attempting the update', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.adminUpdate('missing-id', { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
