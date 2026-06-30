import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

// The worker only ever needs to RELEASE seat locks (once a booking is
// durably confirmed in Postgres, the Redis "soft hold" has done its job and
// should be freed immediately rather than waiting out its TTL). Acquisition
// lives only in events-api, which is the sole place new bookings originate.
//
// Key format must stay identical to events-api's SeatLockService.key():
// `seat:held:${eventId}:${seatCode}`.
@Injectable()
export class SeatLockReleaseService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async release(eventId: string, seatCodes: string[]): Promise<void> {
    if (seatCodes.length === 0) return;
    const keys = seatCodes.map((code) => `seat:held:${eventId}:${code}`);
    await this.redis.del(...keys);
  }
}
