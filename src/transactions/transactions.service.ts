// src/transactions/transactions.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SeatStatus, NotificationChannel, TransactionStatus, ConceptType, PaymentOrderStatus, RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterTransactionDto } from './dto/register-transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';
import { NotificationsService } from '@/notifications/notifications.service';

@Injectable()
export class TransactionsService {
    constructor(
        private readonly prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) { }


    async registerPaymentTransaction(registeringUserId: string, dto: RegisterTransactionDto) {
        const { paymentOrderId, referenceNumber, bankName, imageOfPaymentReceipt, amount, method } = dto;
        const now = new Date();

        return await this.prisma.$transaction(async (tx) => {
            // 1. Obtener la orden de pago con los asientos asociados
            const paymentOrder = await tx.paymentOrder.findUnique({
                where: { id: paymentOrderId },
                include: { eventSeats: true },
            });

            if (!paymentOrder) throw new NotFoundException('Orden de pago no encontrada.');
            if (paymentOrder.registeringUserId !== registeringUserId) throw new ForbiddenException('No tienes permiso para esta orden.');

            // 2. Validar que la reserva no haya expirado (10 minutos)
            const firstSeat = paymentOrder.eventSeats[0];
            if (!firstSeat || (firstSeat.expiresAt && firstSeat.expiresAt < now)) {
                throw new BadRequestException('El tiempo de reserva (10 minutos) ha expirado. Por favor, vuelve a seleccionar los asientos.');
            }

            // 3. Registrar la Transacción en estado 'pending'
            const transaction = await tx.transaction.create({
                data: {
                    paymentOrderId: paymentOrder.id,
                    registeringUserId,
                    clientId: paymentOrder.clientId,
                    concept: paymentOrder.concept,
                    amount,
                    method,
                    referenceNumber,
                    bankName,
                    imageOfPaymentReceipt: imageOfPaymentReceipt
                        ? {
                            create: imageOfPaymentReceipt,
                        }
                        : undefined,
                    status: TransactionStatus.Pendiente,
                },
            });

            // 4. Cambiar estado de asientos a 'payment_pending' para congelar la expiración mientras aprueba el Admin
            await tx.eventSeat.updateMany({
                where: { paymentOrderId: paymentOrder.id },
                data: {
                    status: SeatStatus.Pendiente,
                    expiresAt: null, // Se retira la expiración porque el usuario ya pagó
                },
            });

            return {
                message: 'Comprobante registrado con éxito. En espera de aprobación por el administrador.',
                transaction,
            };
        });
    }
    // ➕ CREATE
    async create(registeringUserId: string, createTransactionDto: CreateTransactionDto) {
        return this.prisma.transaction.create({
            data: {
                registeringUserId,
                clientId: createTransactionDto.clientId,
                paymentOrderId: createTransactionDto.paymentOrderId,
                concept: createTransactionDto.concept,
                amount: createTransactionDto.amount,
                method: createTransactionDto.method,
                referenceNumber: createTransactionDto.referenceNumber,
                bankName: createTransactionDto.bankName,
                status: createTransactionDto.status,
                imageOfPaymentReceipt: createTransactionDto.imageOfPaymentReceipt
                    ? {
                        create: createTransactionDto.imageOfPaymentReceipt,
                    }
                    : undefined,
            },
            include: { imageOfPaymentReceipt: true, registeringUser: true, client: { include: { student: true, user: true } } },
        });
    }


    // 🔍 READ ALL (Con paginación y Filtro de búsqueda por Alumno)
    // 🚀 MÉTODO PÚBLICO 1: Listado general de administración
    async findAll(filters: GetTransactionsFilterDto) {
        const { page = 1, limit = 10 } = filters;
        const where = this.buildWhereClause(filters);

        return this.executePaginatedTransactions(where, page, limit);
    }

    // 🚀 MÉTODO PÚBLICO 2: Operaciones del usuario logueado
    async myOperations(userId: string, filters: GetTransactionsFilterDto) {
        const { page = 1, limit = 10 } = filters;
        // Reutilizamos el constructor del filtro pasando el userId de manera opcional
        const where = this.buildWhereClause(filters, userId);

        return this.executePaginatedTransactions(where, page, limit);
    }

    // ==========================================
    // 🛠️ MÉTODOS PRIVADOS AUXILIARES (REUTILIZABLES)
    // ==========================================

    /**
     * Construye dinámicamente el objeto 'where' de Prisma según los filtros enviados
     */
    private buildWhereClause(filters: GetTransactionsFilterDto, userId?: string): any {
        const { concept, search } = filters;
        const where: any = {};

        if (userId) {
            where.client = {
                userId: userId,
            };
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

        return where;
    }

    /**
     * Encapsula la consulta a la base de datos, paginación y mapeo de los datos hacia la UI
     */
    private async executePaginatedTransactions(where: any, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [transactions, totalItems] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    registeringUser: {
                        select: { firstName: true, lastName: true, email: true, dni: true, phone: true },
                    },
                    client: {
                        include: {
                            user: true,
                            student: true,
                        }
                    },
                    imageOfPaymentReceipt: true,
                },
            }),
            this.prisma.transaction.count({ where }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: transactions.map(tx => ({
                id: tx.id,
                realId: tx.id,
                client: tx.client,
                registeringUser: tx.registeringUser,
                concept: tx.concept,
                amount: Number(tx.amount),
                method: tx.method,
                imageOfPaymentReceipt: tx.imageOfPaymentReceipt,
                createdAt: tx.createdAt.toISOString().split('T')[0],
                status: tx.status,
            })),
            meta: {
                currentPage: Number(page),
                totalPages,
                totalItems,
                itemsPerPage: Number(limit),
            },
        };
    }


    // 🔍 READ ONE
    async findOne(id: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
            include: {
                registeringUser: true,
                client: {
                    include: {
                        student: true,
                        user: true
                    }
                },
                imageOfPaymentReceipt: true,
            },
        });
        if (!transaction) {
            throw new NotFoundException(`Transacción con ID ${id} no encontrada.`);
        }
        return transaction;
    }

    // ✏️ UPDATE
    async update(id: string, updateTransactionDto: UpdateTransactionDto) {
        await this.findOne(id); // Lanza 404 si no existe
        return this.prisma.transaction.update({
            where: { id },
            data: {
                ...updateTransactionDto,
                imageOfPaymentReceipt: updateTransactionDto.imageOfPaymentReceipt
                    ? {
                        create: updateTransactionDto.imageOfPaymentReceipt,
                    }
                    : undefined,
            },
        });
    }

    // ❌ DELETE
    async remove(id: string) {
        await this.findOne(id); // Lanza 404 si no existe
        await this.prisma.transaction.delete({ where: { id } });
        return { message: `Transacción eliminada con éxito.` };
    }

    async approve(transactionId: string, groupId?: string) {
        // 1. Verificar que la transacción exista
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { client: true, paymentOrder: true }
        });

        if (!transaction) {
            throw new NotFoundException('La transacción especificada no existe.');
        }

        if (transaction.status === TransactionStatus.Aprobado) {
            throw new BadRequestException('Esta transacción ya ha sido aprobada previamente.');
        }

        // 2. Si el concepto es matrícula (tuition), obligamos a que venga un groupId
        if (transaction.concept === ConceptType.Inscripción && !groupId) {
            throw new BadRequestException('Para aprobar una matrícula debes asignar un grupo académico.');
        }

        try {
            // Executamos en una transacción de base de datos
            return await this.prisma.$transaction(async (tx) => {
                // 2. Preparar los datos del destinatario
                const client = transaction.client;
                const recipientPhone = client?.phone
                    ? `${client.countryCode || ''}${client.phone}`
                    : undefined;
                const formattedAmount = `$${Number(transaction.amount).toFixed(2)}`;
                const notification = {
                    userId: client?.userId || undefined, // Destinatario específico en el App
                    recipientPhone: recipientPhone,      // Teléfono para WhatsApp
                    title: '¡Pago Confirmado! 🎉',
                    message: `Hola ${client?.firstName || ''}, hemos recibido con éxito tu pago de ${formattedAmount} por concepto de "${transaction.concept}".`,
                    channel: NotificationChannel.Ambos,   // Genera Realtime In-App y envía a WhatsApp
                    link: transaction.paymentOrder?.id ? `/client/payment-orders/${transaction.paymentOrder?.id}` : undefined,
                    metadata: {
                        transactionId: transaction.id,
                        amount: transaction.amount,
                        concept: transaction.concept,
                    },
                }
                // Paso A: Actualizar el estado de la Transacción a aprobado
                const updatedTransaction = await tx.transaction.update({
                    where: { id: transactionId },
                    data: { status: TransactionStatus.Aprobado },
                });

                // Paso B: Actualizar la Orden de Pago relacionada (si existe relación en tu esquema)
                if (transaction.paymentOrderId) {
                    await tx.paymentOrder.update({
                        where: { id: transaction.paymentOrderId },
                        data: {
                            status: PaymentOrderStatus.Pagada,
                        },
                    });
                }

                // Paso C: Si es Matrícula, inscribimos al estudiante en el grupo asignado
                if (transaction.concept === ConceptType.Inscripción && groupId && transaction.clientId) {
                    const group = await this.prisma.group.findUnique({
                        where: { id: groupId },
                        include: {
                            clients: true
                        }
                    });

                    if (!group) {
                        throw new NotFoundException('El grupo especificado no existe.');
                    }

                    if (group.totalNumberOfSlots === group.clients.length) {
                        throw new NotFoundException('Grupo sin cupos disponibles.');
                    }

                    // 1. Buscamos el cliente para obtener su relación con el estudiante
                    const client = await tx.client.findUnique({
                        where: { id: transaction.clientId },
                        select: { id: true, studentId: true },
                    });

                    if (!client) {
                        throw new NotFoundException('El cliente asociado a la transacción no existe.');
                    }

                    // 2. Si el cliente tiene un estudiante asociado, actualizamos el Student
                    if (client.studentId) {
                        await tx.student.update({
                            where: { id: client.studentId }, // 👈 Usamos client.studentId
                            data: { groupId: group.id },
                        });

                        // 💡 CORRECCIÓN: Usamos updateMany con studentId de forma segura dentro de la transacción
                        await tx.registration.updateMany({
                            where: { studentId: client.studentId },
                            data: {
                                status: RegistrationStatus.Aprobado,
                                groupId: group.id
                            },
                        });
                        // 🎯 4. CREAR AUTOMÁTICAMENTE LA PRIMERA ORDEN DE PAGO DE MENSUALIDAD
                        // Calculamos la fecha de vencimiento (Ej: 30 días a partir de hoy, o el primer mes de clases)
                        const nextMonthDueDate = new Date();
                        nextMonthDueDate.setDate(nextMonthDueDate.getDate() + 30);

                        // Opcional: Define el monto de la mensualidad (puedes sacarlo de una configuración o pasarlo en el DTO)
                        const monthlyFeeAmount = 50.00; // (TODO): Reemplaza esto con el monto real de tu mensualidad o configuración
                        await tx.paymentOrder.create({
                            data: {
                                clientId: client.id,
                                studentId: client.studentId, // 👈 Vinculada al alumno correcto
                                concept: ConceptType.Mensualidad,
                                amount: monthlyFeeAmount,
                                dueDate: nextMonthDueDate, // 👈 Se programará para dentro de 30 días
                                status: PaymentOrderStatus.Pendiente,
                                registeringUserId: transaction.registeringUserId,
                            },
                        });
                    }

                    // 3. También actualizamos el groupId en Client si tu negocio lo requiere
                    await tx.client.update({
                        where: { id: client.id },
                        data: { groupId: group.id },
                    });

                    // 4. Actualizamos las inscripciones pendientes
                    await tx.registration.updateMany({
                        where: { clientId: client.id, status: RegistrationStatus.Pendiente },
                        data: {
                            status: RegistrationStatus.Aprobado,
                            groupId: group.id
                        }
                    });

                    notification.message = `${notification.message} La inscripción de estudiante en el grupo "${group.name}" ha sido confirmada.`
                }

                if (transaction.concept === ConceptType.Entradas_Gala) {
                    // 4. Pasar los Asientos a estado 'sold'
                    const updated = await tx.eventSeat.updateMany({
                        where: { paymentOrderId: transaction.paymentOrderId },
                        data: {
                            status: SeatStatus.Pagado,
                            expiresAt: null,
                        },
                    });
                    notification.message = `${notification.message} Entradas para la Gala confirmadas.`
                }
                // 3. Emitir y registrar la notificación (In-App + WhatsApp)
                await this.notificationsService.sendNotification(notification);
                return {
                    message: 'Transacción aprobada con éxito.',
                    transaction: updatedTransaction,
                };
            });
        } catch (error: any) {
            throw new BadRequestException(
                error.message || 'Ocurrió un error inesperado al procesar la aprobación del pago.'
            );
        }
    }
}