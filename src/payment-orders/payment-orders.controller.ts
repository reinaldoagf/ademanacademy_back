import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PaymentOrdersService } from './payment-orders.service';
import { GetPaymentOrdersFilterDto } from './dto/get-payment-orders-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('payment-orders')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class PaymentOrdersController {
    constructor(private readonly paymentOrdersService: PaymentOrdersService) { }

    @Get()
    async findAll(@Query() filters: GetPaymentOrdersFilterDto) {
        return this.paymentOrdersService.findAll(filters);
    }

    @Get('my-orders')
    async findMyOrders(
        @Query() filters: GetPaymentOrdersFilterDto,
        @CurrentUser() user: any // 👈 El decorador extrae el user automáticamente
    ) {
        // Extraemos el id de forma 100% segura y limpia
        const userId = user?.sub;
        // Por ahora, requerimos que el usuario lo envíe o usamos el 'sub' del token si lo configuras
        return this.paymentOrdersService.findMyOrders(filters, userId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.paymentOrdersService.findOne(id);
    }
}