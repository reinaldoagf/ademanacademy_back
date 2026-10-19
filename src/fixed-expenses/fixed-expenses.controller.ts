import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import { FixedExpensesService } from './fixed-expenses.service';
import { GetFixedExpensesFilterDto } from './dto/get-fixed-expenses-filter.dto';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('fixed-expenses')
export class FixedExpensesController {
    constructor(private readonly fixedExpensesService: FixedExpensesService) { }


    // 🎯 1. CREAR UN EVENTO
    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Body() createFixedExpenseDto: CreateFixedExpenseDto) {
        return this.fixedExpensesService.create(createFixedExpenseDto);
    }
    // 🎯 2. OBTENER LISTA CON FILTROS Y PAGINACIÓN
    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Query() filters: GetFixedExpensesFilterDto) {
        return this.fixedExpensesService.findAll(filters);
    }


    // 🎯 5. ACTUALIZAR UN EVENTO
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    async update(@Param('id') id: string, @Body() updateFixedExpenseDto: UpdateFixedExpenseDto) {
        return this.fixedExpensesService.update(id, updateFixedExpenseDto);
    }

    // 🎯 6. ELIMINAR UN EVENTO
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async remove(@Param('id') id: string) {
        return this.fixedExpensesService.remove(id);
    }

    /* TODO: borrar en produccion */
    @Get('run-fixed-expenses-cron')
    async testFixedExpensesCron() {
        // Forzamos la ejecución manual del método del cron job
        await this.fixedExpensesService.processRecurringFixedExpenses();
        return {
            success: true,
            message: 'Cron job de gastos fijos ejecutado manualmente para pruebas.'
        };
    }
}