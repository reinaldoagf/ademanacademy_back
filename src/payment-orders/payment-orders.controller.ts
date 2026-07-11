import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PaymentOrdersService } from './payment-orders.service';
import { GetPaymentOrdersFilterDto } from './dto/get-payment-orders-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payment-orders')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class PaymentOrdersController {
    constructor(private readonly paymentOrdersService: PaymentOrdersService) { }

    @Get()
    async findAll(@Query() filters: GetPaymentOrdersFilterDto) {
        return this.paymentOrdersService.findAll(filters);
    }
}