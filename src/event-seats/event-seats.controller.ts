// event-seats.controller.ts
import { Controller, Post, Body, UseGuards, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
  @UseInterceptors(
    FileInterceptor('receiptFile', {
      storage: diskStorage({
        destination: './uploads/receipts',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `receipt-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
          return callback(
            new BadRequestException('Solo se permiten archivos JPG, PNG o PDF.'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async clientPurchase(
    @CurrentUser() user: any,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = user?.sub || user?.id;

    if (!file) {
      throw new BadRequestException('Debes adjuntar el comprobante de pago (receiptFile).');
    }

    // Parsear arreglos o números recibidos mediante multipart/form-data
    const seatingMapElementIds = typeof body.seatingMapElementIds === 'string'
      ? JSON.parse(body.seatingMapElementIds)
      : body.seatingMapElementIds;

    const dto = {
      eventId: body.eventId,
      seatingMapElementIds,
      totalAmount: Number(body.totalAmount),
      bankName: body.bankName,
      referenceNumber: body.referenceNumber,
    };

    // Pasamos el dto y el nombre asignado al archivo guardado
    return this.eventSeatsService.clientPurchaseSeats(userId, dto, file.filename);
  }
  @Post('reserve')
  reserveOrBuySeats(
    @CurrentUser() user: any, @Body() dto: ReserveSeatsDto) {
    const registeringUserId = user.sub;
    return this.eventSeatsService.reserveOrBuySeats(registeringUserId, dto);
  }
}