// /src/orders/orders.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderItemConceptType, ConceptType, PaymentOrderStatus, ClientType, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { GetOrdersFilterDto } from './dto/get-orders-filter.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService,
        private notificationsService: NotificationsService,) { }

    async create(createOrderDto: CreateOrderDto) {
        let { clientId } = createOrderDto;
        const { items, status } = createOrderDto;

        // 1. Calcular monto total
        const totalAmount = items.reduce((acc, item) => {
            return acc + Number(item.price) * Number(item.quantity);
        }, 0);

        return await this.prisma.$transaction(async (tx) => {
            // 2. Verificar y descontar el stock de los productos
            for (const item of items) {
                if (item.concept === ConceptType.Producto) {
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

                    if (product.currentStock < item.quantity) {
                        throw new BadRequestException(
                            `Stock insuficiente para "${product.name}". Disponible: ${product.currentStock}, Solicitado: ${item.quantity}`,
                        );
                    }

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

            // 🔍 3. Buscar al cliente original y sus relaciones con su usuario y representante
            const client = await tx.client.findUnique({
                where: { id: clientId },
                include: {
                    user: { // Su propio usuario vinculado
                        include: {
                            // Relación inversa configurada en el esquema: el representante del usuario
                            representedClients: true
                        }
                    },
                    representative: true // En caso de usar la relación directa representativeId
                }
            });

            if (!client) {
                throw new NotFoundException(`Cliente con ID "${clientId}" no encontrado.`);
            }

            // 🔄 4. LÓGICA DE REASIGNACIÓN: Si es estudiante y tiene representante, pasamos el clientId al representante
            if (client.type === ClientType.Estudiante) {
                let representativeClientId: string | null = null;

                // Opción A: Si está vinculado mediante el usuario representante (representativeId)
                if (client.representativeId) {
                    const repClient = await tx.client.findFirst({
                        where: {
                            userId: client.representativeId,
                            type: ClientType.Representante
                        }
                    });
                    if (repClient) representativeClientId = repClient.id;
                }

                // Opción B: Si está vinculado a través de los clientes representados del usuario del estudiante
                if (!representativeClientId && client.user?.representedClients?.length) {
                    const repClient = client.user.representedClients.find(c => c.type === ClientType.Representante);
                    if (repClient) representativeClientId = repClient.id;
                }

                // Si encontramos un representante válido, reasignamos el clientId para la orden y el pago
                if (representativeClientId) {
                    clientId = representativeClientId;
                }
            }

            // 5. Crear la Orden con sus OrderItems usando el clientId definitivo (Estudiante o Representante)
            const order = await tx.order.create({
                data: {
                    clientId,
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
                        include: { client: { include: { student: true } } },
                    },
                },
            });

            // 6. Determinar concepto principal para PaymentOrder
            const primaryConcept = items[0]?.concept as unknown as ConceptType;

            // 7. Crear automáticamente la PaymentOrder a nombre del cliente definitivo (Representante si aplica)
            const paymentOrder = await tx.paymentOrder.create({
                data: {
                    clientId,
                    orderId: order.id,
                    concept: primaryConcept,
                    amount: totalAmount,
                    status: PaymentOrderStatus.Pendiente,
                },
            });
            const recipientPhone = client?.phone
                ? `${client.countryCode || ''}${client.phone}`
                : undefined;
            const notification = {
                userId: client?.userId || undefined, // Destinatario específico en el App
                recipientPhone: recipientPhone,      // Teléfono para WhatsApp
                title: '¡Pedido Registrado! 🎉',
                message: `Hola, hemos registrado su pedido para "${client?.firstName} ${client?.lastName}". Puede realizar el pago de la orden en el siguiente enlace:`,
                channel: NotificationChannel.Ambos,   // Genera Realtime In-App y envía a WhatsApp
                link: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/client/payment-orders/${paymentOrder.id}`,
            }
            // 3. Emitir y registrar la notificación (In-App + WhatsApp)
            await this.notificationsService.sendNotification(notification);
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
                    client: {
                        include: { user: true }
                    },
                    items: {
                        include: { client: { include: { student: true } } },
                    },
                    paymentOrder: {
                        include: {
                            transactions: true,
                        }
                    },
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
                client: {
                    include: { user: true }
                },
                items: {
                    include: { client: { include: { student: true } } },
                },
                paymentOrder: {
                    include: {
                        transactions: true,
                    }
                },
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