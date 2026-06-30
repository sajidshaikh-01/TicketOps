import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);

  /**
   * Encodes the booking reference into a scannable QR code and returns it
   * as a data URL. Phase 1 stores this directly on the Booking row
   * (qrCodeUrl); a future phase can swap this for an S3-backed PNG URL
   * without changing the call site.
   */
  async generateForBooking(bookingRef: string): Promise<string | null> {
    try {
      return await QRCode.toDataURL(bookingRef, { width: 240, margin: 1 });
    } catch (err) {
      // A QR generation failure shouldn't fail the whole booking - the
      // booking reference text is still usable for entry/lookup without it.
      this.logger.warn(
        `QR generation failed for ${bookingRef}: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
