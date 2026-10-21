// src/special-rehearsals/special-rehearsals.controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query } from '@nestjs/common';
import { SpecialRehearsalsService } from './special-rehearsals.service';
import { CreateSpecialRehearsalDto } from './dto/create-special-rehearsal.dto';
import { UpdateSpecialRehearsalDto } from './dto/update-special-rehearsal.dto';
import { GetSpecialRehearsalFilterDto } from './dto/get-special-rehearsals-filter.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('special-rehearsals')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class SpecialRehearsalsController {
    constructor(private readonly service: SpecialRehearsalsService) { }

    @Post()
    create(@Body() dto: CreateSpecialRehearsalDto) {
        return this.service.create(dto);
    }

    @Get()
    findAll(@Query() filters: GetSpecialRehearsalFilterDto) {
        return this.service.findAll(filters);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateSpecialRehearsalDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}