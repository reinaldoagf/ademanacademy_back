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
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { EventsService } from './events.service';
import { GetEventsFilterDto } from './dto/get-events-filter.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-events.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('events')
export class EventsController {
    constructor(private readonly eventsService: EventsService,
        private readonly s3Service: S3Service,) { }

    @Get('home')
    async getHomeEvents() {
        return this.eventsService.getHomeEvents();
    }

    // 🎯 1. CREAR UN EVENTO
    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Body() createEventDto: CreateEventDto) {
        return this.eventsService.create(createEventDto);
    }
    // 🎯 2. OBTENER LISTA CON FILTROS Y PAGINACIÓN
    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Query() filters: GetEventsFilterDto) {
        return this.eventsService.findAll(filters);
    }

    // 🎯 3. OBTENER MÉTRICAS/RESUMEN POR ESTADO DE PRODUCCIÓN Y RECAUDACIÓN
    @Get('metrics/summary')
    @UseGuards(JwtAuthGuard)
    async getEventsSummary() {
        return this.eventsService.getEventsSummary();
    }

    // 🎯 4. OBTENER UN EVENTO POR ID O CÓDIGO
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOne(@Param('id') id: string) {
        return this.eventsService.findOne(id);
    }

    // 🎯 5. ACTUALIZAR UN EVENTO
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    async update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
        return this.eventsService.update(id, updateEventDto);
    }

    // 🎯 6. ELIMINAR UN EVENTO
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async remove(@Param('id') id: string) {
        return this.eventsService.remove(id);
    }

}