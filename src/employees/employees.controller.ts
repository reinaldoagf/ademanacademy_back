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
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { GetEmployeesFilterDto } from './dto/get-employees-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
    constructor(private readonly employeesService: EmployeesService) { }

    // 🎯 1. CREAR UN EMPLEADO
    @Post()
    async create(@Body() createEmployeeDto: any) {
        return this.employeesService.create(createEmployeeDto);
    }

    // 🎯 2. OBTENER LISTA CON FILTROS Y PAGINACIÓN
    @Get()
    async findAll(@Query() filters: GetEmployeesFilterDto) {
        return this.employeesService.findAll(filters);
    }

    // 🎯 3. OBTENER MÉTRICAS POR ESTADO DE NÓMINA
    @Get('metrics/payroll-status')
    async getPayrollStatusMetrics() {
        return this.employeesService.getCountByPayrollStatus();
    }

    // 🎯 4. OBTENER UN EMPLEADO POR ID
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.employeesService.findOne(id);
    }

    // 🎯 5. ACTUALIZAR UN EMPLEADO
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateEmployeeDto: any,
    ) {
        return this.employeesService.update(id, updateEmployeeDto);
    }

    // 🎯 6. ELIMINAR UN EMPLEADO
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.employeesService.remove(id);
    }

    // 🎯 7. ASIGNAR UN EMPLEADO A UN GRUPO
    @Post(':id/groups/:groupId')
    @HttpCode(HttpStatus.OK)
    async assignToGroup(
        @Param('id') employeeId: string,
        @Param('groupId') groupId: string,
    ) {
        return this.employeesService.assignToGroup(employeeId, groupId);
    }

    // 🎯 8. REMOVER UN EMPLEADO DE UN GRUPO
    @Delete(':id/groups/:groupId')
    async removeFromGroup(
        @Param('id') employeeId: string,
        @Param('groupId') groupId: string,
    ) {
        return this.employeesService.removeFromGroup(employeeId, groupId);
    }
}