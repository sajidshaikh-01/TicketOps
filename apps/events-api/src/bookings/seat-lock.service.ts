import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

// Encapsulates the Redis-backed "soft hold" on a seat. A booking attempt
// must acquire a lock for every seat it wants before it's allowed to write
// to Postgres. Using SETNX (set-if-not-exists) makes acquisition atomic per
// seat: two concurrent requests racing for the same seat can never both
// succeed, which is exactly the guarantee that prevents double-booking.
@Injectable()
export class SeatLockService {
  private readonly ttlSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.ttlSeconds = this.configService.get<number>('seatLockTtlSeconds', 600);
  }

  private key(eventId: string, seatCode: string): string {
    return `seat:held:${eventId}:${seatCode}`;
  }

  /**
   * Attempts to acquire locks for every given seat code atomically enough
   * that no other request can interleave between "check" and "set". If any
   * seat is already locked, all locks acquired so far in this call are
   * rolled back and the conflicting seat codes are returned.
   */
  async acquireLocks(
    eventId: string,
    seatCodes: string[],
    holderToken: string,
  ): Promise<{ success: true } | { success: false; conflicts: string[] }> {
    const acquired: string[] = [];

    for (const seatCode of seatCodes) {
      const key = this.key(eventId, seatCode);
      // SET key value NX EX ttl -> atomic "set if not exists, with expiry"
      const result = await this.redis.set(
        key,
        holderToken,
        'EX',
        this.ttlSeconds,
        'NX',
      );
      if (result === 'OK') {
        acquired.push(seatCode);
      } else {
        // Conflict: roll back everything we grabbed in this call so we don't
        // leave partial locks dangling for the lock TTL duration.
        await this.releaseLocks(eventId, acquired);
        return { success: false, conflicts: [seatCode] };
      }
    }

    return { success: true };
  }

  async releaseLocks(eventId: string, seatCodes: string[]): Promise<void> {
    if (seatCodes.length === 0) return;
    const keys = seatCodes.map((code) => this.key(eventId, code));
    await this.redis.del(...keys);
  }

  async countHeld(eventId: string): Promise<number> {
    const keys = await this.redis.keys(this.key(eventId, '*'));
    return keys.length;
  }

  /**
   * Releases a lock only if it's still owned by holderToken. Used by the
   * seat-lock-expiry sweep and by explicit cancellation flows so one
   * request can never release a lock acquired by a different booking
   * attempt after its own lock already expired.
   */
  async releaseIfOwnedBy(
    eventId: string,
    seatCode: string,
    holderToken: string,
  ): Promise<void> {
    const key = this.key(eventId, seatCode);
    const current = await this.redis.get(key);
    if (current === holderToken) {
      await this.redis.del(key);
    }
  }
}
