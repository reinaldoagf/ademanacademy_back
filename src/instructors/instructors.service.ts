import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta según tu proyecto
import { GetInstructorsFilterDto } from './dto/get-instructors-filter.dto';
import { TypeOfEmployee } from '@prisma/client';

@Injectable()
export class InstructorsService {
    constructor(private readonly prisma: PrismaService) { }

    // 🔍 READ ALL (Con paginación y filtro por nombre del salón o tipo)
    async findAll(filters: GetInstructorsFilterDto) {
        const { page = 1, limit = 10, search } = filters;
        const skip = (page - 1) * limit;

        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {
            typeOfEmployee: TypeOfEmployee.teaching
        };

        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
            ];
        }

        // Ejecutar consultas en paralelo para optimizar rendimiento en BD
        const [totalItems, data] = await Promise.all([
            this.prisma.employee.count({ where }),
            this.prisma.employee.findMany({
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

}