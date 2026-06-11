import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { GetClassroomsFilterDto } from './dto/get-classrooms-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('classrooms')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class ClassroomsController {
    constructor(private readonly classroomsService: ClassroomsService) { }

    @Post()
    async create(@Body() createClassroomDto: CreateClassroomDto) {
        return this.classroomsService.create(createClassroomDto);
    }

    @Get()
    async findAll(@Query() filters: GetClassroomsFilterDto) {
        return this.classroomsService.findAll(filters);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.classroomsService.findOne(id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateClassroomDto: UpdateClassroomDto) {
        return this.classroomsService.update(id, updateClassroomDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.classroomsService.remove(id);
    }
}