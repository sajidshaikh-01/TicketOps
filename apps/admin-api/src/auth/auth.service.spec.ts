import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, RegisterableRole } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// bcryptjs hashing is deliberately slow (that's the point of bcrypt); mocking
// it keeps these tests fast and lets us assert exact hash/compare behaviour
// without depending on real salt rounds.
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// uuid is only used to make each refresh token's `jti` unique; mocking it
// gives deterministic assertions instead of a random value per test run.
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'fixed-uuid'),
}));

function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

function createMockJwtService() {
  return {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
}

function createMockConfigService() {
  const values: Record<string, unknown> = {
    bcryptSaltRounds: 10,
    'jwt.accessSecret': 'access-secret',
    'jwt.accessExpiresIn': '15m',
    'jwt.refreshSecret': 'refresh-secret',
    'jwt.refreshExpiresIn': '7d',
  };
  return {
    get: jest.fn((key: string) => values[key]),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let configService: ReturnType<typeof createMockConfigService>;

  const existingUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    fullName: 'Test User',
    role: 'CUSTOMER',
    isActive: true,
  };

  beforeEach(() => {
    prisma = createMockPrisma();
    jwtService = createMockJwtService();
    configService = createMockConfigService();
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as any,
      configService as any,
    );

    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'new@example.com',
      password: 'password123',
      fullName: 'New User',
      role: RegisterableRole.CUSTOMER,
    };

    it('creates a user and issues a token pair when the email is free', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password123');
      prisma.user.create.mockResolvedValue({
        id: 'user-2',
        email: dto.email,
        fullName: dto.fullName,
        role: 'CUSTOMER',
      });

      const result = await service.register(dto);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            passwordHash: 'hashed-password123',
            fullName: dto.fullName,
          }),
        }),
      );
      expect(result.user).toEqual({
        id: 'user-2',
        email: dto.email,
        fullName: dto.fullName,
        role: 'CUSTOMER',
      });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('throws ConflictException when the email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('returns a token pair when credentials are valid and the account is active', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result.user).toEqual({
        id: existingUser.id,
        email: existingUser.email,
        fullName: existingUser.fullName,
        role: existingUser.role,
      });
      expect(result.accessToken).toBe('access-token');
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException (without leaking user existence) when the email is unknown', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      // Still compares against a dummy hash so response timing doesn't
      // reveal whether the email exists.
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the account has been deactivated', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...existingUser,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when the JWT itself fails verification', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad signature'));

      await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when no matching, active refresh token is stored', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refresh('valid-jwt')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the stored refresh token has already been revoked', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(service.refresh('valid-jwt')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rotates the token: revokes the used token and issues a brand new pair', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      prisma.user.findUnique.mockResolvedValue(existingUser);

      const result = await service.refresh('valid-jwt');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('logout', () => {
    it('revokes only the matching, currently-active refresh token', async () => {
      const result = await service.logout('user-1', 'some-refresh-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            revokedAt: null,
          }),
          data: { revokedAt: expect.any(Date) },
        }),
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('logoutAllDevices', () => {
    it('revokes every active refresh token for the user', async () => {
      const result = await service.logoutAllDevices('user-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result).toEqual({ message: 'Logged out from all devices' });
    });
  });
});
