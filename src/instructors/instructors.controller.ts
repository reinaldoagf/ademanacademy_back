import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InstructorsService } from './instructors.service';
import { GetInstructorsFilterDto } from './dto/get-instructors-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('instructors')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class InstructorsController {
    constructor(private readonly instructorsService: InstructorsService) { }

    @Get()
    async findAll(@Query() filters: GetInstructorsFilterDto) {
        return this.instructorsService.findAll(filters);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.instructorsService.findOne(id);
    }

}