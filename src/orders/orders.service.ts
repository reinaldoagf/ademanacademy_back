// /src/orders/orders.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderItemConceptType, ConceptType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { GetOrdersFilterDto } from './dto/get-orders-filter.dto';

@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createOrderDto: CreateOrderDto) {
        const { userId, items, status } = createOrderDto;

        // 1. Calcular monto total
        const totalAmount = items.reduce((acc, item) => {
            return acc + Number(item.price) * Number(item.quantity);
        }, 0);

        return await this.prisma.$transaction(async (tx) => {
            // 2. Verificar y descontar el stock de los productos
            for (const item of items) {
                // Solo verificamos stock para los ítems que sean de concepto "product"
                if (item.concept === 'product') {
                    // A. Obtener el producto actual dentro de la transacción
                    const product = await tx.product.findUnique({
                        where: { id: item.elementId },
                    });

                    if (!product) {
                        throw new NotFoundException(
                            `El producto "${item.description || item.conceptLabel || item.elementId}" no existe.`,
                        );
                    }

                    if (!product.isActive) {
                        throw new BadRequestException(
                            `El producto "${product.name}" ya no se encuentra activo.`,
                        );
                    }

                    // B. Verificar disponibilidad suficiente
                    if (product.currentStock < item.quantity) {
                        throw new BadRequestException(
                            `Stock insuficiente para "${product.name}". Disponible: ${product.currentStock}, Solicitado: ${item.quantity}`,
                        );
                    }

                    // C. Decrementar el stock de forma atómica
                    await tx.product.update({
                        where: { id: item.elementId },
                        data: {
                            currentStock: {
                                decrement: item.quantity,
                            },
                        },
                    });
                }
            }

            // 3. Crear la Orden con sus OrderItems
            const order = await tx.order.create({
                data: {
                    userId,
                    totalAmount,
                    ...(status && { status }),
                    items: {
                        create: items.map((item) => ({
                            concept: item.concept as unknown as OrderItemConceptType,
                            quantity: item.quantity,
                            price: item.price,
                            description: item.description,
                            ...(item.studentId ? { studentId: item.studentId } : {}),
                        })),
                    },
                },
                include: {
                    items: {
                        include: { student: true },
                    },
                },
            });

            // 4. Determinar concepto principal para PaymentOrder
            const primaryConcept = items[0]?.concept as unknown as ConceptType;

            // 5. Crear automáticamente la PaymentOrder
            const paymentOrder = await tx.paymentOrder.create({
                data: {
                    userId,
                    orderId: order.id,
                    concept: primaryConcept,
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