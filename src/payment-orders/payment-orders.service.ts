import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta según tu proyecto
import { GetPaymentOrdersFilterDto } from './dto/get-payment-orders-filter.dto'

@Injectable()
export class PaymentOrdersService {
    constructor(private readonly prisma: PrismaService) { }

    // 🔍 READ ALL (Con paginación y filtro por nombre del salón o tipo)
    async findAll(filters: GetPaymentOrdersFilterDto) {
        const { page = 1, limit = 10, search, status, concept } = filters;
        const skip = (page - 1) * limit;

        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {};
        if (status) {
            where.status = status;
        }
        if (concept) {
            where.concept = concept;
        }
        if (search) {
            // CORRECCIÓN: El operador OR de la raíz debe ser un Arreglo []
            where.OR = [
                {
                    user: {
                        OR: [
                            { name: { contains: search } },
                            { email: { contains: search } },
                            { dni: { contains: search } },
                        ],
                    },
                },
                {
                    student: {
                        OR: [
                            { firstName: { contains: search } },
                            { lastName: { contains: search } },
                            { dni: { contains: search } },
                        ],
                    },
                },
            ];
        }

        // Ejecutar consultas en paralelo para optimizar rendimiento en BD
        const [totalItems, data] = await Promise.all([
            this.prisma.paymentOrder.count({ where }),
            this.prisma.paymentOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: true,
                    student: true,
                }
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