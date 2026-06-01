import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { GetStudentsFilterDto } from './dto/get-students-filter.dto';

@Controller('students')
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) { }

    @Post()
    @UseGuards(JwtAuthGuard) // 🔒 Protege la ruta y valida el Bearer Token del Header
    @HttpCode(HttpStatus.CREATED)
    create(
        @Body() createStudentDto: CreateStudentDto,
        @CurrentUser() user: any // 👈 El decorador extrae el user automáticamente
    ) {
        return this.studentsService.create(createStudentDto);
    }

    @Get()
    findAll(@Query() filters: GetStudentsFilterDto) {
        return this.studentsService.findAll(filters);
    }

    @Get('my-represented')
    @UseGuards(JwtAuthGuard) // 🔒 Protege la ruta y valida el Bearer Token del Header
    async getMyStudents(
        @Query() filters: GetStudentsFilterDto,
        @CurrentUser() user: any // 👈 El decorador extrae el user automáticamente
    ) {
        // Extraemos el id de forma 100% segura y limpia
        const userId = user?.sub;

        // Enviamos el userId extraído de forma segura al servicio
        return await this.studentsService.findByUserId(userId, filters);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.studentsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() updateStudentDto: UpdateStudentDto) {
        return this.studentsService.update(id, updateStudentDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.studentsService.remove(id);
    }
}