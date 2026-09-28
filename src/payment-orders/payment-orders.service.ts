import {
    Injectable,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta según tu proyecto
import { GetPaymentOrdersFilterDto } from './dto/get-payment-orders-filter.dto'
import { PaymentOrderStatus } from '@prisma/client';

@Injectable()
export class PaymentOrdersService {
    constructor(private readonly prisma: PrismaService) { }

    async findMyOrdersRecords(registeringUserId: string, filters: GetPaymentOrdersFilterDto,) {
        const { page = 1, limit = 10, search, status, concept } = filters;
        const skip = (page - 1) * limit;

        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {};
        // Filtro por usuario logueado
        where.registeringUserId = registeringUserId;

        if (status) {
            where.status = status;
        }
        if (concept) {
            where.concept = concept;
        }
        if (search) {
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
                    client: {
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
                    registeringUser: true,
                    client: { include: { student: true } }
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
    async findMyOrders(userId: string, filters: GetPaymentOrdersFilterDto,) {
        const { page = 1, limit = 10, search, status, concept } = filters;
        const skip = (page - 1) * limit;

        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {};
        // Filtro por usuario logueado
        where.client = {
            userId: userId
        };

        if (status) {
            where.status = status;
        }
        if (concept) {
            where.concept = concept;
        }
        if (search) {
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
                    client: {
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
                    registeringUser: true,
                    client: { include: { student: true } }
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
                    client: {
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
                    registeringUser: true,
                    client: { include: { user: true, student: true } }
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
        const paymentOrder = await this.prisma.paymentOrder.findUnique({
            where: { id },
            include: {
                registeringUser: true,
                client: { include: { student: true } },
                order: {
                    include: {
                        items: true
                    }
                },
                eventSeats: {
                    include: {
                        event: true,
                        seatingMapElement: true
                    }
                },
                transactions: true
            }
        });

        if (!paymentOrder) {
            throw new NotFoundException(`Orden de pago con ID ${id} no encontrada`);
        }

        return paymentOrder;
    }

    async record(dto: any, file?: Express.Multer.File) {
        const { id, referenceNumber, bankName, amount, status, userId } = dto;

        // 1. Buscar la orden de pago existente con sus relaciones
        const paymentOrder = await this.prisma.paymentOrder.findUnique({
            where: { id },
            include: {
                registeringUser: true,
                client: { include: { student: true } },
                order: {
                    include: {
                        items: true,
                    },
                },
                eventSeats: {
                    include: {
                        event: true,
                        seatingMapElement: true,
                    },
                },
            },
        });

        if (!paymentOrder) {
            throw new NotFoundException(`Orden de pago con ID ${id} no encontrada`);
        }

        // Validar que la orden de pago no haya sido procesada anteriormente
        if (paymentOrder.status === 'paid') {
            throw new BadRequestException('Esta orden de pago ya se encuentra registrada/pagada.');
        }

        const receiptPath = file ? file.filename : null;

        try {
            // 2. Transacción de Prisma para guardar la transacción y actualizar la orden de pago
            return await this.prisma.$transaction(async (tx) => {
                const resolvedUserId = userId || paymentOrder.registeringUserId;

                if (!resolvedUserId) {
                    throw new BadRequestException(
                        'No se encontró un userId asociado para registrar la transacción.',
                    );
                }
                // Operación A: Crear la Transacción
                const transaction = await tx.transaction.create({
                    data: {
                        registeringUserId: resolvedUserId,
                        clientId: paymentOrder.clientId || null,
                        paymentOrderId: paymentOrder.id,
                        concept: paymentOrder.concept || 'ticket',
                        amount: amount ? Number(amount) : paymentOrder.amount,
                        method: 'bank_transfer',
                        status: status || 'pending',
                        referenceNumber: referenceNumber || null,
                        bankName: bankName || null,
                        receiptPath: receiptPath,
                    },
                });


                // 1. Obtener la sumatoria de montos de transacciones APROBADAS para esta orden
                const approvedAggregate = await tx.transaction.aggregate({
                    where: {
                        paymentOrderId: paymentOrder.id,
                        status: 'approved', // Solo transacciones aprobadas
                    },
                    _sum: {
                        amount: true,
                    },
                });

                // Convertir los valores a Number para comparación precisa (evitar inconsistencias de tipo Decimal/String)
                const totalApprovedAmount = Number(approvedAggregate._sum.amount || 0);
                const orderAmount = Number(paymentOrder.amount);

                // 2. Determinar el nuevo estado de la orden de pago
                let newOrderStatus: PaymentOrderStatus = 'pending';

                if (totalApprovedAmount >= orderAmount) {
                    newOrderStatus = 'paid'; // Se pagó completo
                } else if (transaction.status === 'pending') {
                    newOrderStatus = 'pending'; // Tiene transacciones pendientes por revisar
                }

                // Operación B: Actualizar la Orden de Pago con el estado dinámico
                const updatedPaymentOrder = await tx.paymentOrder.update({
                    where: { id: paymentOrder.id },
                    data: {
                        status: newOrderStatus,
                        updatedAt: new Date(),
                    },
                    include: {
                        registeringUser: true,
                        client: true,
                        order: true,
                        eventSeats: true,
                    },
                });

                return {
                    message: 'Pago registrado exitosamente. En espera de aprobación.',
                    transaction,
                    paymentOrder: updatedPaymentOrder,
                };
            });
        } catch (error: any) {
            console.error({ error });
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Error en el servidor al registrar el pago de la orden.'
            );
        }
    }
}