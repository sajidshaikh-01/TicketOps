import { BookingsProcessorService } from './bookings-processor.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QrCodeService } from '../notifications/qrcode.service';
import { SeatLockReleaseService } from './seat-lock-release.service';

function createMockPrisma() {
  return {
    bookingJob: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      update: jest.fn(),
    },
  };
}

function createMockConfigService(maxJobAttempts = 5) {
  return {
    get: jest.fn().mockReturnValue(maxJobAttempts),
  };
}

const baseJob = {
  id: 'job-1',
  bookingId: 'booking-1',
  status: 'PENDING',
  attempts: 0,
  booking: {
    id: 'booking-1',
    bookingRef: 'TKT-1001',
    customerName: 'Alice',
    customerEmail: 'alice@example.com',
    event: { id: 'evt-1', title: 'Jazz Night' },
    seats: [
      { seat: { seatCode: 'A1' } },
      { seat: { seatCode: 'A2' } },
    ],
  },
};

describe('BookingsProcessorService', () => {
  let service: BookingsProcessorService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let notificationsService: jest.Mocked<
    Pick<NotificationsService, 'sendBookingConfirmation' | 'sendFailureNotice'>
  >;
  let qrCodeService: jest.Mocked<Pick<QrCodeService, 'generateForBooking'>>;
  let seatLockReleaseService: jest.Mocked<Pick<SeatLockReleaseService, 'release'>>;
  let configService: ReturnType<typeof createMockConfigService>;

  beforeEach(() => {
    prisma = createMockPrisma();
    notificationsService = {
      sendBookingConfirmation: jest.fn(),
      sendFailureNotice: jest.fn(),
    };
    qrCodeService = { generateForBooking: jest.fn() };
    seatLockReleaseService = { release: jest.fn() };
    configService = createMockConfigService();

    service = new BookingsProcessorService(
      prisma as unknown as PrismaService,
      notificationsService as unknown as NotificationsService,
      qrCodeService as unknown as QrCodeService,
      seatLockReleaseService as unknown as SeatLockReleaseService,
      configService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processMessage', () => {
    it('looks up the job and delegates to processJob when found', async () => {
      prisma.bookingJob.findUnique.mockResolvedValue({ id: 'job-1' });
      const processJobSpy = jest
        .spyOn(service, 'processJob')
        .mockResolvedValue(undefined);

      await service.processMessage({
        jobId: 'job-1',
        bookingId: 'booking-1',
        bookingRef: 'TKT-1001',
        eventTitle: 'Jazz Night',
        customerName: 'Alice',
        customerEmail: 'alice@example.com',
        seatCodes: ['A1', 'A2'],
      });

      expect(processJobSpy).toHaveBeenCalledWith('job-1');
    });

    it('skips silently when no BookingJob exists for the message', async () => {
      prisma.bookingJob.findUnique.mockResolvedValue(null);
      const processJobSpy = jest.spyOn(service, 'processJob');

      await service.processMessage({
        jobId: 'missing-job',
        bookingId: 'booking-1',
        bookingRef: 'TKT-1001',
        eventTitle: 'Jazz Night',
        customerName: 'Alice',
        customerEmail: 'alice@example.com',
        seatCodes: [],
      });

      expect(processJobSpy).not.toHaveBeenCalled();
    });
  });

  describe('processJob', () => {
    it('returns early when the job no longer exists', async () => {
      prisma.bookingJob.findUnique.mockResolvedValue(null);

      await service.processJob('missing-job');

      expect(prisma.bookingJob.update).not.toHaveBeenCalled();
    });

    it('returns early as a no-op when the job is already DONE', async () => {
      prisma.bookingJob.findUnique.mockResolvedValue({
        ...baseJob,
        status: 'DONE',
      });

      await service.processJob('job-1');

      expect(prisma.bookingJob.update).not.toHaveBeenCalled();
      expect(qrCodeService.generateForBooking).not.toHaveBeenCalled();
    });

    it('marks the job and booking FAILED once max attempts is reached', async () => {
      prisma.bookingJob.findUnique.mockResolvedValue({
        ...baseJob,
        attempts: 5, // equal to mocked maxJobAttempts (5)
      });

      await service.processJob('job-1');

      expect(prisma.bookingJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { status: 'FAILED' },
      });
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'FAILED' },
      });
      expect(qrCodeService.generateForBooking).not.toHaveBeenCalled();
    });

    it('confirms the booking, notifies, releases the seat lock, and marks the job DONE on success', async () => {
      prisma.bookingJob.findUnique.mockResolvedValue(baseJob);
      qrCodeService.generateForBooking.mockResolvedValue('data:image/png;base64,xyz');

      await service.processJob('job-1');

      // First update bumps attempts and flips to PROCESSING.
      expect(prisma.bookingJob.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'job-1' },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'CONFIRMED', qrCodeUrl: 'data:image/png;base64,xyz' },
      });

      expect(notificationsService.sendBookingConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'booking-1',
          bookingRef: 'TKT-1001',
          eventTitle: 'Jazz Night',
          seatCodes: ['A1', 'A2'],
        }),
      );

      expect(seatLockReleaseService.release).toHaveBeenCalledWith('evt-1', [
        'A1',
        'A2',
      ]);

      // Final update marks the job DONE.
      expect(prisma.bookingJob.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'job-1' },
        data: { status: 'DONE', processedAt: expect.any(Date) },
      });
    });

    it('marks the job PENDING for retry and sends a failure notice when processing throws', async () => {
      prisma.bookingJob.findUnique.mockResolvedValue(baseJob);
      qrCodeService.generateForBooking.mockRejectedValue(
        new Error('QR service unreachable'),
      );

      await service.processJob('job-1');

      expect(prisma.bookingJob.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'job-1' },
        data: { status: 'PENDING', lastError: 'QR service unreachable' },
      });
      expect(notificationsService.sendFailureNotice).toHaveBeenCalledWith(
        'TKT-1001',
        'alice@example.com',
        'QR service unreachable',
      );
      // A failed attempt must not be confirmed or have its lock released.
      expect(seatLockReleaseService.release).not.toHaveBeenCalled();
    });
  });
});
