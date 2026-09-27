// event-seats.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EventSeatsService } from './event-seats.service';
import { ReserveSeatsDto } from './dto/reserve-seats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('event-seats')
@UseGuards(JwtAuthGuard)
export class EventSeatsController {
  constructor(private readonly eventSeatsService: EventSeatsService) { }

  @Post('reserve')
  reserveOrBuySeats(
    @CurrentUser() user: any, @Body() dto: ReserveSeatsDto) {
    const registeringUserId = user.sub;
    return this.eventSeatsService.reserveOrBuySeats(registeringUserId, dto);
  }
}