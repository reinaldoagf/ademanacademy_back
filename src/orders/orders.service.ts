import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { GetOrdersFilterDto } from './dto/get-orders-filter.dto';

@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createOrderDto: CreateOrderDto) {
        const { userId, items, status } = createOrderDto;

        // Calcular monto total a partir de los ítems
        const totalAmount = items.reduce((acc, item) => {
            return acc + item.price * item.quantity;
        }, 0);

        return await this.prisma.$transaction(async (tx) => {
            // 1. Crear la Orden con sus OrderItems
            const order = await tx.order.create({
                data: {
                    userId,
                    totalAmount,
                    ...(status && { status }),
                    items: {
                        create: items.map((item) => ({
                            concept: item.concept,
                            quantity: item.quantity,
                            price: item.price,
                            studentId: item.studentId ?? null,
                        })),
                    },
                },
                include: {
                    items: {
                        include: { student: true },
                    },
                },
            });

            // 2. Crear automáticamente la PaymentOrder (relación 1-a-1)
            const paymentOrder = await tx.paymentOrder.create({
                data: {
                    userId,
                    orderId: order.id,
                    concept: items[0].concept, // Se asigna el concepto principal
                    amount: totalAmount,
                    status: 'pending',
                },
            });

            return {
                ...order,
                paymentOrder,
            };
        });
    }

    async findAll(filters: GetOrdersFilterDto) {
        const { page = 1, limit = 10, search } = filters;
        const skip = (page - 1) * limit;
        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {};

        if (search) {
            where.OR = [
                { user: { name: { contains: search } } },
            ];
        }

        // Ejecutar consultas en paralelo para optimizar rendimiento en BD
        const [totalItems, data] = await Promise.all([
            this.prisma.order.count({ where }),
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: true,
                    items: {
                        include: { student: true },
                    },
                    paymentOrder: true,
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

    async findOne(id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                user: true,
                items: {
                    include: { student: true },
                },
                paymentOrder: true,
            },
        });

        if (!order) {
            throw new NotFoundException(`Pedido con ID "${id}" no encontrado.`);
        }

        return order;
    }

    async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto) {
        await this.findOne(id);

        return await this.prisma.order.update({
            where: { id },
            data: { status: updateOrderStatusDto.status },
            include: {
                items: true,
                paymentOrder: true,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return await this.prisma.order.delete({
            where: { id },
        });
    }
}