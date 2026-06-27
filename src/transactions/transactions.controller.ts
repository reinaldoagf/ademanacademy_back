// src/transactions/transactions.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';
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
        @Query() filters: GetTransactionsFilterDto
    ) {
        return this.transactionsService.findAll(filters);
    }

    @Get('/my-operations')
    async myOperations(
        @CurrentUser() user: any,
        @Query() filters: GetTransactionsFilterDto
    ) {
        const userId = user?.sub;
        return this.transactionsService.myOperations(userId, filters);
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

    @Patch(':id/approve')
    async approve(
        @Param('id') id: string,
        @Body() body: { groupId?: string }
    ) {
        return this.transactionsService.approve(id, body.groupId);
    }
}