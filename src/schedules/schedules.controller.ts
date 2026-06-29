import { Controller, Post, Body, UsePipes, UseGuards, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateScheduleDto } from '@/schedules/dto/create-schedule.dto';

@Controller('schedules')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class SchedulesController {
    constructor(private readonly schedulesService: SchedulesService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    async create(@Body() createScheduleDto: CreateScheduleDto) {
        return await this.schedulesService.create(createScheduleDto);
    }
}