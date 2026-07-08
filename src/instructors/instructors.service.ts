import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta según tu proyecto
import { GetInstructorsFilterDto } from './dto/get-instructors-filter.dto'

@Injectable()
export class InstructorsService {
    constructor(private readonly prisma: PrismaService) { }

    // 🔍 READ ALL (Con paginación y filtro por nombre del salón o tipo)
    async findAll(filters: GetInstructorsFilterDto) {
        const { page = 1, limit = 10, search } = filters;
        const skip = (page - 1) * limit;

        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {};

        where.isAnInstructor = true;

        if (search) {
            where.OR = [
                { name: { contains: search } },
            ];
        }

        // Ejecutar consultas en paralelo para optimizar rendimiento en BD
        const [totalItems, data] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            },
            data,
        };
    }

    // 🔍 READ ONE
    async findOne(id: string) {
        const instructor = await this.prisma.user.findUnique({
            where: { id, isAnInstructor: true },
            /* include: { instructors: true } // Trae la información de los grupos asignados */
        });

        if (!instructor) {
            throw new NotFoundException(`El salón con ID "${id}" no existe.`);
        }

        return instructor;
    }

}