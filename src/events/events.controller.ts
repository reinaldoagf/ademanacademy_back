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
    UseInterceptors,
    UploadedFiles,
    BadRequestException
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EventsService } from './events.service';
import { GetEventsFilterDto } from './dto/get-events-filter.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-events.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CleanupOnErrorInterceptor } from '../interceptors/cleanup-on-error.interceptor';
import { ImageRole } from '@prisma/client';
import { CreateEventImageDto } from './dto/create-event-image.dto';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    // 🎯 1. CREAR UN EVENTO
    @Post()
    @UseInterceptors(
        FilesInterceptor('images', 10, {
            storage: diskStorage({
                destination: './uploads/events', // Carpeta para imágenes de eventos
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `event-${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
                    return callback(
                        new BadRequestException('Solo se permiten archivos de imagen (jpg, jpeg, png, webp)'),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
        CleanupOnErrorInterceptor,
    )
    async create(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() body: any,
    ) {
        // 1. Extraer las rutas de las imágenes subidas
        const uploadedImages = files?.map((file, index) => ({
            url: `/uploads/events/${file.filename}`,
            altText: file.originalname,
            // La primera imagen se asigna por defecto como 'cover', las demás como 'gallery'
            type: index === 0 ? 'cover' : 'gallery',
            order: index,
        })) || [];

        // 2. Parsear campos JSON del multipart/form-data si vienen como string
        const sponsors = typeof body.sponsors === 'string'
            ? JSON.parse(body.sponsors)
            : body.sponsors;

        const createEventDto: CreateEventDto = {
            ...body,
            isPresaleActive: body.isPresaleActive === 'true' || body.isPresaleActive === true,
            sponsors,
            images: uploadedImages,
        };

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
    @UseInterceptors(
        FilesInterceptor('images', 10, {
            storage: diskStorage({
                destination: './uploads/events',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `event-${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
                    return callback(
                        new BadRequestException('Solo se permiten archivos de imagen (jpg, jpeg, png, webp)'),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
        CleanupOnErrorInterceptor,
    )
    async update(
        @Param('id') id: string,
        @UploadedFiles() files: Express.Multer.File[],
        @Body() body: any,
    ) {
        // ✅ CORRECTO: Le indicas a TypeScript que puede ser un arreglo O undefined
        let uploadedImages: CreateEventImageDto[] | undefined = undefined;

        if (files && files.length > 0) {
            uploadedImages = files.map((file, index) => ({
                url: `/uploads/events/${file.filename}`,
                altText: file.originalname,
                type: index === 0 ? ImageRole.cover : ImageRole.gallery,
                order: index,
            }));
        }

        const sponsors = typeof body.sponsors === 'string'
            ? JSON.parse(body.sponsors)
            : body.sponsors;

        const updateEventDto: UpdateEventDto = {
            ...body,
            ...(body.isPresaleActive !== undefined && {
                isPresaleActive: body.isPresaleActive === 'true' || body.isPresaleActive === true,
            }),
            ...(sponsors && { sponsors }),
            ...(uploadedImages && { images: uploadedImages }),
        };

        return this.eventsService.update(id, updateEventDto);
    }

    // 🎯 6. ELIMINAR UN EVENTO
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.eventsService.remove(id);
    }
}