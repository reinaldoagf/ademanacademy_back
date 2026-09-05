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
                throw new BadRequestException('La fecha de fin no puede ser anterior a la fecha de inicio.');
            }

            // Si no viene código, se puede autogenerar uno correlativo sencillo
            let eventCode = data.code;
            if (!eventCode) {
                const year = startDate.getFullYear();
                const count = await this.prisma.event.count();
                eventCode = `EVE-${year}-${String(count + 1).padStart(2, '0')}`;
            }

            return await this.prisma.event.create({
                data: {
                    code: eventCode,
                    name: data.name,
                    type: data.type ?? EventType.sample,
                    startDate,
                    endDate,
                    productionStatus: data.productionStatus ?? ProductionStatus.planning,
                    description: data.description,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(`Ya existe un evento registrado con el código "${data.code}".`);
            }
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
                { code: { contains: search } },
            ];
        }

        const [totalItems, data] = await Promise.all([
            this.prisma.event.count({ where }),
            this.prisma.event.findMany({
                where,
                skip,
                take,
                orderBy: { startDate: 'asc' },
                include: { seatingMap: true }
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
    async findOne(idOrCode: string) {
        const event = await this.prisma.event.findFirst({
            where: {
                OR: [{ id: idOrCode }, { code: idOrCode }],
            },
        });

        if (!event) {
            throw new NotFoundException(`Evento con identificador "${idOrCode}" no encontrado.`);
        }

        return event;
    }

    // 🎯 4. ACTUALIZAR EVENTO
    async update(id: string, updateData: UpdateEventDto) {
        await this.findOne(id); // Lanza NotFoundException si no existe

        const { startDate, endDate, ...data } = updateData;

        const parsedStartDate = startDate ? new Date(startDate) : undefined;
        const parsedEndDate = endDate ? new Date(endDate) : undefined;

        if (parsedStartDate && isNaN(parsedStartDate.getTime())) {
            throw new BadRequestException('La fecha de inicio no es válida.');
        }
        if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
            throw new BadRequestException('La fecha de fin no es válida.');
        }

        try {
            return await this.prisma.event.update({
                where: { id },
                data: {
                    ...data,
                    ...(parsedStartDate && { startDate: parsedStartDate }),
                    ...(parsedEndDate && { endDate: parsedEndDate }),
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