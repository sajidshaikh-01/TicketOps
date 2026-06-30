import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QrCodeService } from './qrcode.service';

@Module({
  providers: [NotificationsService, QrCodeService],
  exports: [NotificationsService, QrCodeService],
})
export class NotificationsModule {}
