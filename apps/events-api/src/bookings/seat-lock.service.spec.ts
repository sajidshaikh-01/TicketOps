import { SeatLockService } from './seat-lock.service';

function createMockRedis() {
  return {
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    get: jest.fn(),
  };
}

function createMockConfigService(ttlSeconds = 600) {
  return {
    get: jest.fn().mockReturnValue(ttlSeconds),
  };
}

describe('SeatLockService', () => {
  let service: SeatLockService;
  let redis: ReturnType<typeof createMockRedis>;
  let configService: ReturnType<typeof createMockConfigService>;

  beforeEach(() => {
    redis = createMockRedis();
    configService = createMockConfigService();
    service = new SeatLockService(
      redis as any,
      configService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('acquireLocks', () => {
    it('acquires a lock per seat using SET NX EX and returns success', async () => {
      redis.set.mockResolvedValue('OK');

      const result = await service.acquireLocks(
        'evt-1',
        ['A1', 'A2'],
        'holder-token',
      );

      expect(result).toEqual({ success: true });
      expect(redis.set).toHaveBeenCalledTimes(2);
      expect(redis.set).toHaveBeenNthCalledWith(
        1,
        'seat:held:evt-1:A1',
        'holder-token',
        'EX',
        600,
        'NX',
      );
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('rolls back already-acquired seats and reports the conflict when one seat is already held', async () => {
      // First seat acquires fine, second seat is already locked (SET NX returns null).
      redis.set
        .mockResolvedValueOnce('OK')
        .mockResolvedValueOnce(null);

      const result = await service.acquireLocks(
        'evt-1',
        ['A1', 'A2'],
        'holder-token',
      );

      expect(result).toEqual({ success: false, conflicts: ['A2'] });
      // Rollback releases the one seat (A1) acquired before the conflict.
      expect(redis.del).toHaveBeenCalledWith('seat:held:evt-1:A1');
    });
  });

  describe('releaseLocks', () => {
    it('does nothing when given an empty seat list', async () => {
      await service.releaseLocks('evt-1', []);
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('deletes the Redis key for every seat code given', async () => {
      await service.releaseLocks('evt-1', ['A1', 'B2']);
      expect(redis.del).toHaveBeenCalledWith(
        'seat:held:evt-1:A1',
        'seat:held:evt-1:B2',
      );
    });
  });

  describe('countHeld', () => {
    it('returns the number of matching held-seat keys for the event', async () => {
      redis.keys.mockResolvedValue([
        'seat:held:evt-1:A1',
        'seat:held:evt-1:A2',
      ]);

      const result = await service.countHeld('evt-1');

      expect(redis.keys).toHaveBeenCalledWith('seat:held:evt-1:*');
      expect(result).toBe(2);
    });
  });

  describe('releaseIfOwnedBy', () => {
    it('deletes the lock when the current holder token matches', async () => {
      redis.get.mockResolvedValue('holder-token');

      await service.releaseIfOwnedBy('evt-1', 'A1', 'holder-token');

      expect(redis.del).toHaveBeenCalledWith('seat:held:evt-1:A1');
    });

    it('does not delete the lock when the holder token does not match', async () => {
      redis.get.mockResolvedValue('someone-elses-token');

      await service.releaseIfOwnedBy('evt-1', 'A1', 'holder-token');

      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
