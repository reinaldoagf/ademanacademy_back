import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    ConceptType,
    PaymentOrderStatus,
    TransactionStatus,
    PaymentMethod,
    RegistrationStatus,
    NotificationChannel,
    NotificationStatus
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetRegistrationsFilterDto } from './dto/get-registrations-filter.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { NotificationsService } from '@/notifications/notifications.service';

@Injectable()
export class RegistrationsService {
    private readonly logger = new Logger(RegistrationsService.name);

    constructor(private readonly prisma: PrismaService, private readonly notificationsService: NotificationsService,) { }
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
                        select: { firstName: true, lastName: true, email: true, dni: true, phone: true },
                    },
                    student: true,
                    client: true,
                    group: true,
                },
            }),
            this.prisma.registration.count({ where }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);


        // Adaptamos la respuesta para que encaje perfectamente con la UI genérica
        return {
            data: registrations,
            meta: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
            },
        };
    }
    async create(userId: string, dto: CreateRegistrationDto) {
        const { payment } = dto;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                ownedClients: true
            }
        });
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }
        const client = await this.prisma.client.findUnique({
            where: { id: payment?.clientId },
            include: { student: true }
        });
        if (!client) {
            throw new NotFoundException(`Cliente con ID ${payment?.clientId} no encontrado`);
        }
        if (!payment) {
            throw new BadRequestException('Los datos de pago son obligatorios para la inscripción.');
        }

        return await this.prisma.$transaction(async (tx) => {
            // 1. Crear la Orden de Pago (PaymentOrder) para la inscripción
            const paymentOrder = await tx.paymentOrder.create({
                data: {
                    clientId: client.id,
                    studentId: client.student?.id,
                    concept: ConceptType.Inscripción,
                    amount: payment.amount,
                    status: PaymentOrderStatus.Pendiente,
                    registeringUserId: user.id,
                },
            });

            // 2. Crear la Transacción asociada con la URL directa del comprobante en S3
            const transaction = await tx.transaction.create({
                data: {
                    registeringUserId: user.id,
                    clientId: client.id,
                    paymentOrderId: paymentOrder.id,
                    concept: ConceptType.Inscripción,
                    amount: payment.amount,
                    method: PaymentMethod.Transferencia,
                    status: TransactionStatus.Pendiente,
                    bankName: payment.bankName,
                    referenceNumber: payment.referenceNumber,
                    receiptPath: payment.receiptPath, // 👈 Se guarda el enlace de S3
                },
            });

            // 3. Crear el registro de inscripción (Registration) en estado Pendiente
            const registration = await tx.registration.create({
                data: {
                    status: RegistrationStatus.Pendiente,
                    userId: user.id,
                    studentId: client.student?.id,
                    clientId: client.id,
                },
            });

            return {
                paymentOrder,
                transaction,
                registration,
            };
        });
    }
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleMonthlyRenewals() {
        this.logger.log('Iniciando verificación de vencimientos de mensualidades...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. CASO 1: Próximos a vencer (Ej: Faltan 3 días para el vencimiento)
        const warningDate = new Date();
        warningDate.setDate(today.getDate() + 3);
        warningDate.setHours(0, 0, 0, 0);

        await this.processUpcomingExpirations(warningDate);

        // 2. CASO 2: Llegó el día exacto de vencimiento
        await this.processExactExpirations(today);

        // 3. CASO 3: Han pasado 7 días o más desde el vencimiento sin renovar
        const overdueLimitDate = new Date();
        overdueLimitDate.setDate(today.getDate() - 7);
        overdueLimitDate.setHours(0, 0, 0, 0);

        await this.processOverdueCancellations(overdueLimitDate);
    }

    /**
     * 1. Aproxime el vencimiento (Faltan 3 días): Notificar y generar orden de pago
     */
    private async processUpcomingExpirations(targetDate: Date) {
        const paymentOrders = await this.prisma.paymentOrder.findMany({
            where: {
                concept: ConceptType.Mensualidad,
                status: PaymentOrderStatus.Pendiente,
                dueDate: {
                    gte: targetDate,
                    lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000), // Rango de ese día
                },
            },
            include: {
                client: { include: { user: true, representative: true } },
                student: { include: { clients: true } } // 👈 Incluimos al estudiante directamente
            },
        });

        for (const order of paymentOrders) {
            const recipientUser = order.client?.representative || order.client?.user;
            const studentClientData = order.student?.clients?.[0]; // Datos personales del estudiante (nombre/apellido)

            if (!recipientUser || !studentClientData) continue;

            this.logger.log(`[AVISO] La mensualidad del estudiante ${studentClientData.firstName} está próxima a vencer.`);

            const notification = {
                userId: recipientUser.id,
                recipientPhone: recipientUser.phone,
                title: 'Próximo vencimiento de mensualidad ⏳',
                message: `Hola ${recipientUser.firstName || ''}, te recordamos que la mensualidad del estudiante ${studentClientData.firstName} ${studentClientData.lastName} vence en 3 días.`,
                channel: NotificationChannel.Ambos,
                link: `/client/payment-orders/${order.id}`
            };
            await this.notificationsService.sendNotification(notification);
        }
    }

    /**
     * 2. Llegó el día del vencimiento: Volver a notificar
     */
    private async processExactExpirations(today: Date) {
        const paymentOrders = await this.prisma.paymentOrder.findMany({
            where: {
                concept: ConceptType.Mensualidad,
                status: PaymentOrderStatus.Pendiente,
                dueDate: {
                    gte: today,
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                },
            },
            include: {
                client: { include: { user: true, representative: true } },
                student: { include: { clients: true } }
            },
        });

        for (const order of paymentOrders) {
            const recipientUser = order.client?.representative || order.client?.user;
            const studentClientData = order.student?.clients?.[0];

            if (!recipientUser || !studentClientData) continue;

            this.logger.log(`[VENCIMIENTO HOY] La mensualidad de ${studentClientData.firstName} vence hoy.`);

            const notification = {
                userId: recipientUser.id,
                recipientPhone: recipientUser.phone,
                title: 'Mensualidad vencida hoy ⚠️',
                message: `El plazo para la mensualidad del estudiante ${studentClientData.firstName} ${studentClientData.lastName} vence el día de hoy. Por favor reporte su pago.`,
                channel: NotificationChannel.Ambos,
                link: `/client/payment-orders/${order.id}`
            };
            await this.notificationsService.sendNotification(notification);
        }
    }

    /**
     * 3. 7 días después del vencimiento sin pagar: Quitar del grupo y notificar
     */
    private async processOverdueCancellations(limitDate: Date) {
        const overdueOrders = await this.prisma.paymentOrder.findMany({
            where: {
                concept: ConceptType.Mensualidad,
                status: PaymentOrderStatus.Pendiente,
                dueDate: {
                    lte: limitDate,
                },
            },
            include: {
                client: {
                    include: {
                        user: true,
                        representative: true,
                    }
                },
                student: { include: { clients: true } } // 👈 Incluimos al estudiante directamente
            },
        });

        for (const order of overdueOrders) {
            const studentId = order.studentId;
            const studentClientData = order.student?.clients?.[0];
            const recipientUser = order.client?.representative || order.client?.user;

            if (!studentId) continue;

            // Ejecutamos una transacción para desvincular al estudiante del grupo
            await this.prisma.$transaction(async (tx) => {
                // A. Desvincular de la tabla Student
                await tx.student.update({
                    where: { id: studentId },
                    data: { groupId: null },
                });

                // B. Desvincular en los perfiles Client asociados al estudiante si aplica
                await tx.client.updateMany({
                    where: { studentId: studentId },
                    data: { groupId: null },
                });

                // C. Marcar la orden de pago como Anulada/Vencida
                await tx.paymentOrder.update({
                    where: { id: order.id },
                    data: { status: PaymentOrderStatus.Anulada },
                });
            });

            if (recipientUser && studentClientData) {
                this.logger.log(`[SUSPENSIÓN] Estudiante ${studentClientData.firstName} removido del grupo por falta de pago.`);

                await this.notificationsService.sendNotification({
                    userId: recipientUser.id,
                    recipientPhone: recipientUser.phone,
                    title: 'Estudiante desvinculado por falta de pago 🚫',
                    message: `Han transcurrido 7 días desde el vencimiento de la mensualidad de ${studentClientData.firstName} ${studentClientData.lastName}. El estudiante ha sido removido de su grupo asignado.`,
                    channel: NotificationChannel.Ambos,
                });
            }
        }
    }
}