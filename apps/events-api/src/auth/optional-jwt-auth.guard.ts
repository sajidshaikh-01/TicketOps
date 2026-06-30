import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}

// events-api supports guest checkout, so authentication here is OPTIONAL:
// if a valid Bearer token is present we attach req.user (used to link a
// booking to an account and to power "my bookings"), but we never reject the
// request just because the token is missing. Endpoints that truly require a
// logged-in user (e.g. "my bookings") check req.user themselves and 401 if absent.
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.header('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return true; // no token: proceed as guest
    }

    const token = authHeader.slice('Bearer '.length);
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });
      request.user = payload;
    } catch {
      // Invalid/expired token: treat as guest rather than failing the request.
      // This keeps browsing/booking resilient to a stale token in localStorage.
    }

    return true;
  }
}
