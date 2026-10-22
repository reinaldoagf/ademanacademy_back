// event-seats.controller.ts
import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { EventSeatsService } from './event-seats.service';
import { ReserveSeatsDto } from './dto/reserve-seats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { ClientPurchaseSeatsDto } from './dto/client-purchase-seats.dto';

@Controller('event-seats')
@UseGuards(JwtAuthGuard)
export class EventSeatsController {
  constructor(private readonly eventSeatsService: EventSeatsService) { }
  @Post('client-purchase')
  @UseGuards(JwtAuthGuard)
  async clientPurchase(
    @CurrentUser() user: any,
    @Body() body: ClientPurchaseSeatsDto,
  ) {
    const userId = user?.sub || user?.id;
    const { eventId, seatingMapElementIds, bankName, referenceNumber, totalAmount, imageOfPaymentReceipt } = body
    if (!imageOfPaymentReceipt) {
      throw new BadRequestException('Debes adjuntar el comprobante de pago.');
    }

    const dto = {
      eventId,
      seatingMapElementIds,
      totalAmount,
      bankName,
      referenceNumber,
      imageOfPaymentReceipt
    };

    // Pasamos el dto y el nombre asignado al archivo guardado
    return this.eventSeatsService.clientPurchaseSeats(userId, dto);
  }
  @Post('reserve')
  reserveOrBuySeats(
    @CurrentUser() user: any, @Body() dto: ReserveSeatsDto) {
    const registeringUserId = user.sub;
    return this.eventSeatsService.reserveOrBuySeats(registeringUserId, dto);
  }
}