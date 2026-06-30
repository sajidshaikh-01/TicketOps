import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { ListEventsQueryDto } from './dto/list-events-query.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({
    summary: 'List published events with optional filters and pagination',
  })
  findAll(@Query() query: ListEventsQueryDto) {
    return this.eventsService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List distinct categories across published events' })
  listCategories() {
    return this.eventsService.listCategories();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single event with seat availability summary',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Get the full seat map for an event' })
  getSeatMap(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getSeatMap(id);
  }
}
