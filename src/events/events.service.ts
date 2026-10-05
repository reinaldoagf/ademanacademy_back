import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { Prisma, ProductionStatus } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-events.dto';
import { GetEventsFilterDto } from './dto/get-events-filter.dto';


@Injectable()
export class EventsService {
    constructor(private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,) { }

    // 🎯 1. CREAR EVENTO
    async create(dto: CreateEventDto) {
        const { images, sponsors, seatingMapId, ...eventData } = dto;

        return this.prisma.event.create({
            data: {
                ...eventData,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                presaleStartDate: dto.presaleStartDate ? new Date(dto.presaleStartDate) : null,
                presaleEndDate: dto.presaleEndDate ? new Date(dto.presaleEndDate) : null,
                seatingMap: seatingMapId ? { connect: { id: seatingMapId } } : undefined,
                images: images?.length
                    ? {
                        create: images.map((img, idx) => ({
                            url: img.url,
                            key: img.key,
                            altText: img.altText || dto.name,
                            type: idx === 0 ? 'cover' : 'gallery',
                            order: idx,
                        })),
                    }
                    : undefined,
                sponsors: sponsors?.length
                    ? {
                        create: sponsors.map((s, idx) => ({
                            name: s.name,
                            logoUrl: s.logoUrl,
                            tier: s.tier,
                            websiteUrl: s.websiteUrl,
                            socialLinks: s.socialLinks,
                        })),
                    }
                    : undefined,
            },
            include: { images: true, sponsors: true, seatingMap: true },
        });
    }

    // 🎯 2. OBTENER TODOS CON FILTROS Y PAGINACIÓN
    async findAll(filters: GetEventsFilterDto) {
        const {
            page = 1,
            limit = 10,
            search,
            type,
            productionStatus,
            startDate,
            endDate,
        } = filters;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where: Prisma.EventWhereInput = { isActive: true };

        if (type) where.type = type;
        if (productionStatus) where.productionStatus = productionStatus;

        // Filtro por rango de fechas
        if (startDate || endDate) {
            where.startDate = {};
            if (startDate) where.startDate.gte = new Date(startDate);
            if (endDate) where.startDate.lte = new Date(endDate);
        }

        // Búsqueda por Nombre, Lugar o Código
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { seatingMap: { location: { contains: search } } },
            ];
        }

        const [totalItems, data] = await Promise.all([
            this.prisma.event.count({ where }),
            this.prisma.event.findMany({
                where,
                skip,
                take,
                orderBy: { startDate: 'asc' },
                include: {
                    images: true,
                    sponsors: true,
                    eventSeats: true,
                    seatingMap: { include: { elements: true } }
                }
            }),
        ]);

        return {
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: take,
                totalPages: Math.ceil(totalItems / take),
                currentPage: Number(page),
            },
            data,
        };
    }

    // 🎯 3. OBTENER UN EVENTO POR ID O CÓDIGO
    async findOne(id: string) {
        const event = await this.prisma.event.findFirst({
            where: {
                id,
            },
            include: {
                images: true,
                sponsors: true,
                seatingMap: { include: { elements: true } },
                eventSeats: true,
            },
        });

        if (!event) {
            throw new NotFoundException(`Evento con identificador "${id}" no encontrado.`);
        }

        return event;
    }


    // 🎯 4. ACTUALIZAR EVENTO
    async update(id: string, dto: UpdateEventDto) {
        const currentEvent = await this.prisma.event.findUnique({
            where: { id },
            include: { images: true },
        });

        if (!currentEvent) throw new NotFoundException('Evento no encontrado');

        const { images, sponsors, seatingMapId, ...eventData } = dto;
        // 🎯 Limpieza de imágenes eliminadas en S3 y BD
        if (images) {
            const newKeys = images.map((img) => img.key);
            const imagesToDelete = currentEvent.images.filter((img) => !newKeys.includes(img.key));

            // 1. Borrar de S3
            await Promise.all(imagesToDelete.map((img) => this.s3Service.deleteFile(img.key)));

            // 2. Limpiar registros anteriores de imágenes en BD para este evento
            await this.prisma.eventImage.deleteMany({
                where: { eventId: id },
            });
        }

        if (sponsors) {
            await this.prisma.sponsor.deleteMany({
                where: { eventId: id },
            });
        }

        return this.prisma.event.update({
            where: { id },
            data: {
                ...eventData,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
                presaleStartDate: dto.presaleStartDate ? new Date(dto.presaleStartDate) : null,
                presaleEndDate: dto.presaleEndDate ? new Date(dto.presaleEndDate) : null,
                seatingMap: seatingMapId ? { connect: { id: seatingMapId } } : undefined,
                images: images?.length
                    ? {
                        create: images.map((img, idx) => ({
                            url: img.url,
                            key: img.key,
                            altText: img.altText || dto.name || currentEvent.name,
                            type: img.type || (idx === 0 ? 'cover' : 'gallery'),
                            order: img.order ?? idx,
                        })),
                    }
                    : undefined,
                sponsors: sponsors?.length
                    ? {
                        create: sponsors.map((s) => ({
                            name: s.name,
                            logoUrl: s.logoUrl,
                            tier: s.tier,
                            websiteUrl: s.websiteUrl,
                            socialLinks: s.socialLinks,
                        })),
                    }
                    : undefined,
            },
            include: { images: true, sponsors: true, seatingMap: true },
        });
    }

    // 🎯 5. ELIMINAR EVENTO (Soft delete o Delete físico)
    async remove(id: string) {
        await this.findOne(id);

        const currentEvent = await this.prisma.event.delete({
            where: { id },
            include: { images: true },
        });

        // 🎯 Limpieza de imágenes eliminadas en S3 y BD
        if (currentEvent.images.length) {
            // 1. Borrar de S3
            await Promise.all(currentEvent.images.map((img) => this.s3Service.deleteFile(img.key)));

            // 2. Limpiar registros anteriores de imágenes en BD para este evento
            await this.prisma.eventImage.deleteMany({
                where: { eventId: id },
            });
        }

        return {
            message: 'Evento eliminado correctamente.',
            id,
        };
    }

    // 🎯 6. OBTENER MÉTRICAS/RESUMEN DE EVENTOS (Por Estado de Producción y Métricas de Tickets)
    async getEventsSummary() {
        const [countsByStatus, totals] = await Promise.all([
            this.prisma.event.groupBy({
                by: ['productionStatus'],
                where: { isActive: true },
                _count: {
                    productionStatus: true,
                },
            }),
            this.prisma.event.findMany({
                where: { isActive: true }
            }),
        ]);

        // Mapeo inicial por enum
        const statusMap = Object.values(ProductionStatus).reduce((acc, status) => {
            acc[status] = 0;
            return acc;
        }, {} as Record<ProductionStatus, number>);

        let totalEvents = 0;
        countsByStatus.forEach((group) => {
            const count = group._count.productionStatus;
            statusMap[group.productionStatus] = count;
            totalEvents += count;
        });
        return {
            totalEvents,
            totalTicketsSold: 10,
            totalRevenue: 10,
            byStatus: statusMap,
        };
    }

    async getHomeEvents() {
        try {
            const events = await this.prisma.event.findMany({
                where: {
                    isActive: true,
                    publishToHome: true,
                },
                include: {
                    images: true,
                    sponsors: true,
                    seatingMap: {
                        select: {
                            location: true,
                        },
                    },
                },
                orderBy: {
                    startDate: "asc",
                },
            });

            return events;
        } catch (error) {
            console.error("Error al obtener eventos para la Home:", error);
            return [];
        }
    }
}