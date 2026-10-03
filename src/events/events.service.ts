import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ProductionStatus, EventType } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-events.dto';
import { GetEventsFilterDto } from './dto/get-events-filter.dto';

@Injectable()
export class EventsService {
    constructor(private readonly prisma: PrismaService) { }

    // 🎯 1. CREAR EVENTO
    async create(data: CreateEventDto) {
        try {
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new BadRequestException('Las fechas del evento no son válidas.');
            }

            if (endDate < startDate) {
                throw new BadRequestException(
                    'La fecha de fin no puede ser anterior a la fecha de inicio.',
                );
            }

            // Validaciones de fechas de preventa
            let presaleStartDate: Date | undefined;
            let presaleEndDate: Date | undefined;

            if (data.presaleStartDate) {
                presaleStartDate = new Date(data.presaleStartDate);
                if (isNaN(presaleStartDate.getTime())) {
                    throw new BadRequestException('La fecha de inicio de preventa no es válida.');
                }
            }

            if (data.presaleEndDate) {
                presaleEndDate = new Date(data.presaleEndDate);
                if (isNaN(presaleEndDate.getTime())) {
                    throw new BadRequestException('La fecha de fin de preventa no es válida.');
                }
            }

            if (presaleStartDate && presaleEndDate && presaleEndDate < presaleStartDate) {
                throw new BadRequestException(
                    'La fecha de fin de preventa no puede ser anterior a la fecha de inicio de preventa.',
                );
            }
            const { images, sponsors, ...eventData } = data;

            return await this.prisma.event.create({
                data: {
                    name: eventData.name,
                    type: eventData.type ?? EventType.sample,
                    startDate,
                    endDate,
                    isPresaleActive: eventData.isPresaleActive ?? false,
                    presaleStartDate,
                    presaleEndDate,
                    productionStatus: eventData.productionStatus ?? ProductionStatus.planning,
                    description: eventData.description,
                    seatingMapId: eventData.seatingMapId,
                    // Relaciones anidadas en la creación
                    ...(images && images.length > 0 && {
                        images: {
                            create: images.map((img) => ({
                                url: img.url,
                                altText: img.altText,
                                type: img.type,
                                order: img.order ?? 0,
                            })),
                        },
                    }),
                    ...(sponsors && sponsors.length > 0 && {
                        sponsors: {
                            create: sponsors.map((s) => ({
                                name: s.name,
                                logoUrl: s.logoUrl,
                                tier: s.tier,
                                websiteUrl: s.websiteUrl,
                                socialLinks: s.socialLinks ?? Prisma.DbNull,
                            })),
                        },
                    }),
                },
                include: {
                    images: true,
                    sponsors: true,
                    seatingMap: true,
                },
            });
        } catch (error) {
            throw error;
        }
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
    async update(id: string, updateData: UpdateEventDto) {
        await this.findOne(id); // Lanza NotFoundException si no existe

        const {
            startDate,
            endDate,
            presaleStartDate,
            presaleEndDate,
            images,
            sponsors,
            ...data
        } = updateData;

        const parsedStartDate = startDate ? new Date(startDate) : undefined;
        const parsedEndDate = endDate ? new Date(endDate) : undefined;
        const parsedPresaleStartDate = presaleStartDate ? new Date(presaleStartDate) : undefined;
        const parsedPresaleEndDate = presaleEndDate ? new Date(presaleEndDate) : undefined;

        if (parsedStartDate && isNaN(parsedStartDate.getTime())) {
            throw new BadRequestException('La fecha de inicio no es válida.');
        }
        if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
            throw new BadRequestException('La fecha de fin no es válida.');
        }
        if (parsedPresaleStartDate && isNaN(parsedPresaleStartDate.getTime())) {
            throw new BadRequestException('La fecha de inicio de preventa no es válida.');
        }
        if (parsedPresaleEndDate && isNaN(parsedPresaleEndDate.getTime())) {
            throw new BadRequestException('La fecha de fin de preventa no es válida.');
        }

        try {
            return await this.prisma.event.update({
                where: { id },
                data: {
                    ...data,
                    ...(parsedStartDate && { startDate: parsedStartDate }),
                    ...(parsedEndDate && { endDate: parsedEndDate }),
                    ...(parsedPresaleStartDate !== undefined && { presaleStartDate: parsedPresaleStartDate }),
                    ...(parsedPresaleEndDate !== undefined && { presaleEndDate: parsedPresaleEndDate }),
                    // Actualización opcional de imágenes (reemplaza las imágenes existentes si se envían)
                    ...(images && {
                        images: {
                            deleteMany: {}, // Limpia imágenes previas
                            create: images.map((img) => ({
                                url: img.url,
                                altText: img.altText,
                                type: img.type,
                                order: img.order ?? 0,
                            })),
                        },
                    }),
                    // Actualización opcional de patrocinadores (reemplaza si se envían)
                    ...(sponsors && {
                        sponsors: {
                            deleteMany: {}, // Limpia patrocinadores previos
                            create: sponsors.map((s) => ({
                                name: s.name,
                                logoUrl: s.logoUrl,
                                tier: s.tier,
                                websiteUrl: s.websiteUrl,
                                socialLinks: s.socialLinks ?? Prisma.DbNull,
                            })),
                        },
                    }),
                },
                include: {
                    images: true,
                    sponsors: true,
                    seatingMap: true,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException('El código de evento ya está asignado a otro registro.');
            }
            throw error;
        }
    }

    // 🎯 5. ELIMINAR EVENTO (Soft delete o Delete físico)
    async remove(id: string) {
        await this.findOne(id);

        await this.prisma.event.delete({
            where: { id },
        });

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
}