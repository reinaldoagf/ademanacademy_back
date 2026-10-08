// src/uniforms/uniforms.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { UniformsService } from './uniforms.service';
import { GetUniformsFilterDto } from './dto/get-uniforms-filter.dto';
import { AssignUniformDto, UpdateAssignmentStatusDto } from './dto/assign-uniform.dto';
import { CreateUniformDto } from './dto/create-uniform.dto';
import { UpdateUniformDto } from './dto/update-uniform.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('uniforms')
@UseGuards(JwtAuthGuard)
export class UniformsController {
    constructor(private readonly uniformsService: UniformsService) { }

    @Post()
    async create(
        @Body() createUniformDto: CreateUniformDto
    ) {
        return this.uniformsService.create(createUniformDto);
    }

    @Get()
    async findAll(@Query() filters: GetUniformsFilterDto) {
        return this.uniformsService.findAll(filters);
    }

    @Get('my-assignments')
    async findMyUniforms(
        @CurrentUser() user: any, // 👈 El decorador extrae el user automáticamente
        @Query() filters: GetUniformsFilterDto,
    ) {
        // Extraemos el id de forma 100% segura y limpia
        const userId = user?.sub;
        // Por ahora, requerimos que el usuario lo envíe o usamos el 'sub' del token si lo configuras
        return this.uniformsService.findMyUniforms(userId, filters);
    }
    @Get('count-by-status')
    async getCountByStatus() {
        return this.uniformsService.getCountByStatus();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.uniformsService.findOne(id);
    }
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateUniformDto: UpdateUniformDto, // o UpdateProductDto incluyendo existingImages
    ) {
        // Pasamos los datos al servicio
        return this.uniformsService.update(id, updateUniformDto);
    }
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.uniformsService.remove(id);
    }

    // 🎯 Rutas de Asignación
    @Post('assign')
    async assignToStudentWithParam(
        @Body() assignUniformDto: AssignUniformDto,
    ) {
        return await this.uniformsService.assignToStudent(assignUniformDto);
    }

    @Patch('assignments/:assignmentId')
    async updateAssignmentStatus(
        @Param('assignmentId') assignmentId: string,
        @Body() updateAssignmentStatusDto: UpdateAssignmentStatusDto,
    ) {
        return this.uniformsService.updateAssignmentStatus(assignmentId, updateAssignmentStatusDto);
    }

}