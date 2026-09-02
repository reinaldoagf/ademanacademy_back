import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseUUIDPipe,
    UseGuards,
    Query
} from '@nestjs/common';
import { SeatingMapsService } from './seating-maps.service';
import { CreateSeatingMapDto } from './dto/create-seating-map.dto';
import { UpdateSeatingMapDto } from './dto/update-seating-map.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetSeatingMapsFilterDto } from './dto/get-seating-maps-filter.dto';

@Controller('seating-maps')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class SeatingMapsController {
    constructor(private readonly seatingMapsService: SeatingMapsService) { }

    @Post()
    create(@Body() createSeatingMapDto: CreateSeatingMapDto) {
        return this.seatingMapsService.create(createSeatingMapDto);
    }

    @Get()
    findAll(@Query() filters: GetSeatingMapsFilterDto) {
        return this.seatingMapsService.findAll(filters);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.seatingMapsService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateSeatingMapDto: UpdateSeatingMapDto,
    ) {
        return this.seatingMapsService.update(id, updateSeatingMapDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.seatingMapsService.remove(id);
    }
}