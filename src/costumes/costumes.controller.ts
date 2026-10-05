// src/costumes/costumes.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CostumesService } from './costumes.service';
import { GetCostumesFilterDto } from './dto/get-costumes-filter.dto';
import { AssignCostumeDto, UpdateAssignmentStatusDto } from './dto/assign-costume.dto';
import { CreateCostumeDto } from './dto/create-costume.dto';
import { UpdateCostumeDto } from './dto/update-costume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('costumes')
export class CostumesController {
    constructor(private readonly costumesService: CostumesService) { }
    @Post()
    @UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
    async create(
        @Body() createCostumeDto: CreateCostumeDto
    ) {
        return this.costumesService.create(createCostumeDto);
    }

    @Get()
    async findAll(@Query() filters: GetCostumesFilterDto) {
        return this.costumesService.findAll(filters);
    }

    @Get('count-by-status')
    async getCountByStatus() {
        return this.costumesService.getCountByStatus();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.costumesService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
    async update(
        @Param('id') id: string,
        @Body() updateCostumeDto: UpdateCostumeDto, // o UpdateProductDto incluyendo existingImages
    ) {
        // Pasamos los datos al servicio
        return this.costumesService.update(id, updateCostumeDto);
    }
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.costumesService.remove(id);
    }

    // 🎯 Rutas de Asignación
    @Post(':id/assign')
    async assignToStudent(
        @Param('id') costumeId: string,
        @Body() assignCostumeDto: AssignCostumeDto,
    ) {
        return this.costumesService.assignToStudent(costumeId, assignCostumeDto);
    }

    @Patch('assignments/:assignmentId')
    async updateAssignmentStatus(
        @Param('assignmentId') assignmentId: string,
        @Body() updateAssignmentStatusDto: UpdateAssignmentStatusDto,
    ) {
        return this.costumesService.updateAssignmentStatus(assignmentId, updateAssignmentStatusDto);
    }

}