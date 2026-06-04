// src/transactions/transactions.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard) // 🛡️ Protege todo el módulo de finanzas
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post()
    async create(@Body() createTransactionDto: CreateTransactionDto) {
        return this.transactionsService.create(createTransactionDto);
    }

    @Get()
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.transactionsService.findAll(pageNum, limitNum, search);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.transactionsService.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto) {
        return this.transactionsService.update(id, updateTransactionDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.transactionsService.remove(id);
    }
}