import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';
import type { AppConfig } from '../config/configuration';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const saltRounds = this.configService.get('bcryptSaltRounds', {
      infer: true,
    });
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role ?? 'CUSTOMER',
      },
    });

    this.logger.log(
      JSON.stringify({
        message: 'user registered',
        user_id: user.id,
        role: user.role,
      }),
    );

    const tokens = await this.issueTokenPair(user.id, user.email, user.role);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Compare against a dummy hash when the user doesn't exist so the
    // response time doesn't leak "this email isn't registered" via timing.
    const passwordHash =
      user?.passwordHash ?? '$2a$10$invalidsaltinvalidsaltinvalidsalt';
    const passwordMatches = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const tokens = await this.issueTokenPair(user.id, user.email, user.role);
    this.logger.log(
      JSON.stringify({ message: 'user logged in', user_id: user.id }),
    );

    return { user: this.toSafeUser(user), ...tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account no longer active');
    }

    // Rotate: revoke the used refresh token and issue a brand new pair. This
    // means a stolen-but-already-used refresh token is immediately useless,
    // which limits the damage window of a leaked token.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(user.id, user.email, user.role);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  async logoutAllDevices(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out from all devices' };
  }

  // --- helpers -----------------------------------------------------------

  private async issueTokenPair(
    userId: string,
    email: string,
    role: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role: role as JwtPayload['role'],
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwt.accessSecret', { infer: true }),
      expiresIn: this.configService.get('jwt.accessExpiresIn', { infer: true }),
    });

    const refreshExpiresIn = this.configService.get('jwt.refreshExpiresIn', {
      infer: true,
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, jti: uuidv4() }, // jti: unique per token so two tokens for the same user never hash identically
      {
        secret: this.configService.get('jwt.refreshSecret', { infer: true }),
        expiresIn: refreshExpiresIn,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.computeExpiry(refreshExpiresIn),
      },
    });

    return { accessToken, refreshToken };
  }

  // Refresh tokens are stored as SHA-256 hashes, never plaintext, so a
  // database read/leak alone can't be used to forge a session - the hash
  // can't be reversed back into a usable token.
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private computeExpiry(expiresIn: string): Date {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) {
      // Fallback: treat unparsable values as 7 days rather than throwing,
      // since this only affects DB bookkeeping, not the JWT's own expiry.
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const [, amountStr, unit] = match;
    const amount = parseInt(amountStr, 10);
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return new Date(Date.now() + amount * unitMs[unit]);
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
