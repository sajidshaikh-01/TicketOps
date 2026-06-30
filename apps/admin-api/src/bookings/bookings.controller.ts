import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BookingsService } from './bookings.service';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';

@ApiTags('admin-bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ORGANIZER')
@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Dashboard summary: total events, tickets sold, revenue, booking breakdown',
  })
  getDashboard(@Req() req: Request) {
    return this.bookingsService.getDashboardStats(req.user as JwtPayload);
  }

  @Get('bookings')
  @ApiOperation({
    summary:
      'List bookings (ORGANIZER scoped to their own events, ADMIN sees all)',
  })
  findAll(@Query() query: ListBookingsQueryDto, @Req() req: Request) {
    return this.bookingsService.findAll(query, req.user as JwtPayload);
  }

  @Get('bookings/:id')
  @ApiOperation({
    summary: 'Get a single booking with full event/seat/customer detail',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.bookingsService.findOne(id, req.user as JwtPayload);
  }

  @Post('bookings/:id/cancel')
  @ApiOperation({
    summary: 'Cancel a booking on behalf of a customer and release its seats',
  })
  cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.bookingsService.cancel(id, req.user as JwtPayload);
  }
}
