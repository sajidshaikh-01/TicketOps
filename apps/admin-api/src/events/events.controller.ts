import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';

@ApiTags('admin-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ORGANIZER')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an event with a generated seat map' })
  create(@Body() dto: CreateEventDto, @Req() req: Request) {
    return this.eventsService.create(dto, req.user as JwtPayload);
  }

  @Get()
  @ApiOperation({
    summary: 'List events (ADMIN sees all, ORGANIZER sees only their own)',
  })
  findAll(@Req() req: Request) {
    return this.eventsService.findAll(req.user as JwtPayload);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single event (including unpublished drafts, if permitted)',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.eventsService.findOne(id, req.user as JwtPayload);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event details' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @Req() req: Request,
  ) {
    return this.eventsService.update(id, dto, req.user as JwtPayload);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an event (blocked if it has active bookings)',
  })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.eventsService.remove(id, req.user as JwtPayload);
  }

  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publish an event, making it visible on the public site',
  })
  publish(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.eventsService.publish(id, req.user as JwtPayload);
  }

  @Post(':id/unpublish')
  @ApiOperation({
    summary: 'Unpublish an event, hiding it from the public site',
  })
  unpublish(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.eventsService.unpublish(id, req.user as JwtPayload);
  }
}
