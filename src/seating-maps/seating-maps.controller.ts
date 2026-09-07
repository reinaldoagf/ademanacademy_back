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
    Query,
    Req,
    Res,
    Next
} from '@nestjs/common';
import { SeatingMapsService } from './seating-maps.service';
import { CreateSeatingMapDto } from './dto/create-seating-map.dto';
import { UpdateSeatingMapDto } from './dto/update-seating-map.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetSeatingMapsFilterDto } from './dto/get-seating-maps-filter.dto';
import * as express from 'express';
// Definimos el parser con el límite ampliado
const jsonParserWithLargeLimit = express.json({ limit: '50mb' });
@Controller('seating-maps')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class SeatingMapsController {
    constructor(private readonly seatingMapsService: SeatingMapsService) { }

    @Post()
    async create(
        @Req() req: any,
        @Res() res: any,
        @Body() createSeatingMapDto: CreateSeatingMapDto) {
        // Aplica el límite extendido solo a esta petición
        await new Promise((resolve, reject) => {
            jsonParserWithLargeLimit(req, res, (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
        const result = await this.seatingMapsService.create(req.body || createSeatingMapDto);
        return res.status(201).json(result);
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