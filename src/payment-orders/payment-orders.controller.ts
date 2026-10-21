import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { PaymentOrdersService } from './payment-orders.service';
import { GetPaymentOrdersFilterDto } from './dto/get-payment-orders-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { TransactionStatus } from '@prisma/client';
import { RecordPaymentOrderDto } from './dto/record-payment-order.dto';

@Controller('payment-orders')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class PaymentOrdersController {
    constructor(private readonly paymentOrdersService: PaymentOrdersService) { }

    @Get()
    async findAll(@Query() filters: GetPaymentOrdersFilterDto) {
        return this.paymentOrdersService.findAll(filters);
    }

    @Get('my-orders/records')
    async findMyOrdersRecords(
        @CurrentUser() user: any, // 👈 El decorador extrae el user automáticamente
        @Query() filters: GetPaymentOrdersFilterDto,
    ) {
        // Extraemos el id de forma 100% segura y limpia
        const registeringUserId = user?.sub;
        // Por ahora, requerimos que el usuario lo envíe o usamos el 'sub' del token si lo configuras
        return this.paymentOrdersService.findMyOrdersRecords(registeringUserId, filters);
    }
    @Get('my-orders')
    async findMyOrders(
        @CurrentUser() user: any, // 👈 El decorador extrae el user automáticamente
        @Query() filters: GetPaymentOrdersFilterDto,
    ) {
        // Extraemos el id de forma 100% segura y limpia
        const userId = user?.sub;
        // Por ahora, requerimos que el usuario lo envíe o usamos el 'sub' del token si lo configuras
        return this.paymentOrdersService.findMyOrders(userId, filters);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.paymentOrdersService.findOne(id);
    }

    @Post(':id/record')
    async completeOnboarding(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() body: RecordPaymentOrderDto,
    ) {
        const { imageOfPaymentReceipt } = body

        if (!imageOfPaymentReceipt && user.isAdmin === false) {
            throw new BadRequestException('Debes adjuntar el comprobante de pago.');
        }

        const dto = {
            id,
            referenceNumber: body.referenceNumber,
            bankName: body.bankName,
            amount: body.amount ?? 0,
            imageOfPaymentReceipt,
            userId: user.sub,
            status: user.isAdmin === true ? TransactionStatus.Aprobado : TransactionStatus.Pendiente,
        };

        // 🚀 Pasamos el objeto "file" completo al servicio
        return this.paymentOrdersService.record(dto);
    }
}