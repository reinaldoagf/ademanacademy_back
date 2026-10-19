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
@UseGuards(JwtAuthGuard)
export class FixedExpensesController {
    constructor(private readonly FixedExpensesService: FixedExpensesService) { }


    // 🎯 1. CREAR UN EVENTO
    @Post()
    async create(@Body() createFixedExpenseDto: CreateFixedExpenseDto) {
        return this.FixedExpensesService.create(createFixedExpenseDto);
    }
    // 🎯 2. OBTENER LISTA CON FILTROS Y PAGINACIÓN
    @Get()
    async findAll(@Query() filters: GetFixedExpensesFilterDto) {
        return this.FixedExpensesService.findAll(filters);
    }


    // 🎯 5. ACTUALIZAR UN EVENTO
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateFixedExpenseDto: UpdateFixedExpenseDto) {
        return this.FixedExpensesService.update(id, updateFixedExpenseDto);
    }

    // 🎯 6. ELIMINAR UN EVENTO
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.FixedExpensesService.remove(id);
    }

}