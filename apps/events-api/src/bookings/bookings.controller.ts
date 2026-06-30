import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Create a booking for one or more seats (guest checkout supported)',
  })
  create(@Body() dto: CreateBookingDto, @Req() req: Request) {
    return this.bookingsService.createBooking(dto, req.user, req.requestId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the logged-in user's bookings" })
  getMyBookings(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.bookingsService.getMyBookings(req.user.sub);
  }

  @Get(':ref')
  @ApiOperation({
    summary: 'Look up a booking by its booking reference (e.g. TKT-482913)',
  })
  getByRef(@Param('ref') ref: string) {
    return this.bookingsService.getByRef(ref);
  }

  @Post(':ref/cancel')
  @ApiOperation({ summary: 'Cancel a booking and release its seats' })
  cancel(@Param('ref') ref: string, @Req() req: Request) {
    return this.bookingsService.cancelBooking(ref, req.requestId);
  }
}
