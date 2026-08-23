import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsPayableService } from './accounts-payable.service';
import { CreateAccountPayableDto } from './dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/update-account-payable.dto';
import { FilterAccountPayableDto } from './dto/filter-account-payable.dto';
import { CreatePayablePaymentDto } from './dto/create-payable-payment.dto';

@Controller('accounts-payable')
@UseGuards(JwtAuthGuard)
export class AccountsPayableController {
    constructor(
        private readonly accountPayablesService: AccountsPayableService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createDto: CreateAccountPayableDto) {
        return this.accountPayablesService.create(createDto);
    }

    @Get()
    findAll(@Query() filters: FilterAccountPayableDto) {
        return this.accountPayablesService.findAll(filters);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.accountPayablesService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateDto: UpdateAccountPayableDto,
    ) {
        return this.accountPayablesService.update(id, updateDto);
    }

    @Post(':id/payments')
    @HttpCode(HttpStatus.CREATED)
    addPayment(
        @Param('id') id: string,
        @Body() paymentDto: CreatePayablePaymentDto,
    ) {
        return this.accountPayablesService.addPayment(id, paymentDto);
    }

    @Patch(':id/cancel')
    cancel(@Param('id') id: string) {
        return this.accountPayablesService.cancel(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string) {
        return this.accountPayablesService.remove(id);
    }
}