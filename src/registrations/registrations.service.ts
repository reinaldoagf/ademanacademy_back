import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetRegistrationsFilterDto } from './dto/get-registrations-filter.dto';

@Injectable()
export class RegistrationsService {

    constructor(private readonly prisma: PrismaService) { }
    // 🔍 READ ALL (Con paginación y Filtro de búsqueda por Alumno)
    async findAll(filters: GetRegistrationsFilterDto) {
        const { page = 1, limit = 10, search } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            // Clausura de búsqueda condicional
            where.OR = {
                user: {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' as const } },
                        { email: { contains: search, mode: 'insensitive' as const } },
                        { dni: { contains: search, mode: 'insensitive' as const } },
                    ],
                },
                student: {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' as const } },
                        { lastName: { contains: search, mode: 'insensitive' as const } },
                        { dni: { contains: search, mode: 'insensitive' as const } },
                    ],
                },
                group: {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' as const } },
                    ],
                },
            };
        }

        const [registrations, totalItems] = await Promise.all([
            this.prisma.registration.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }, // Transacciones más recientes primero
                include: {
                    user: {
                        select: { name: true, email: true, dni: true, phone: true },
                    },
                    student: true
                },
            }),
            this.prisma.registration.count({ where }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);


        // Adaptamos la respuesta para que encaje perfectamente con la UI genérica
        return {
            data: registrations.map(tx => ({
                id: tx.id, // Máscara estética parecida a tu mock (TX-901)
                realId: tx.id,
                student: tx.student,
                user: tx.user,
                status: tx.status,
                createdAt: tx.createdAt.toISOString().split('T')[0],
            })),
            meta: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
            },
        };
    }
}