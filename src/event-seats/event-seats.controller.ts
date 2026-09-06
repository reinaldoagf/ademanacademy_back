// event-seats.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { EventSeatsService } from './event-seats.service';
import { ReserveSeatsDto } from './dto/reserve-seats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('event-seats')
@UseGuards(JwtAuthGuard)
export class EventSeatsController {
  constructor(private readonly eventSeatsService: EventSeatsService) {}

  @Post('reserve')
  reserveOrBuySeats(@Body() dto: ReserveSeatsDto, @Req() req: any) {
    // Si no viene userId explicito, tomamos el del token JWT autenticado
    const userId = dto.userId || req.user?.id;
    return this.eventSeatsService.reserveOrBuySeats({ ...dto, userId });
  }
}