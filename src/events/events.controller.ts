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
import { EventsService } from './events.service';
import { GetEventsFilterDto } from './dto/get-events-filter.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-events.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    // 🎯 1. CREAR UN EVENTO
    @Post()
    async create(@Body() createEventDto: CreateEventDto) {
        return this.eventsService.create(createEventDto);
    }

    // 🎯 2. OBTENER LISTA CON FILTROS Y PAGINACIÓN
    @Get()
    async findAll(@Query() filters: GetEventsFilterDto) {
        return this.eventsService.findAll(filters);
    }

    // 🎯 3. OBTENER MÉTRICAS/RESUMEN POR ESTADO DE PRODUCCIÓN Y RECAUDACIÓN
    @Get('metrics/summary')
    async getEventsSummary() {
        return this.eventsService.getEventsSummary();
    }

    // 🎯 4. OBTENER UN EVENTO POR ID O CÓDIGO
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.eventsService.findOne(id);
    }

    // 🎯 5. ACTUALIZAR UN EVENTO
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateEventDto: UpdateEventDto,
    ) {
        return this.eventsService.update(id, updateEventDto);
    }

    // 🎯 6. ELIMINAR UN EVENTO
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.eventsService.remove(id);
    }
}