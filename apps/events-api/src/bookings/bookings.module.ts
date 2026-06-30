import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { SeatLockService } from './seat-lock.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [JwtModule.register({})], // secret/options supplied per-call via ConfigService in the guards
  controllers: [BookingsController],
  providers: [
    BookingsService,
    SeatLockService,
    OptionalJwtAuthGuard,
    JwtAuthGuard,
  ],
  exports: [BookingsService, SeatLockService],
})
export class BookingsModule {}
