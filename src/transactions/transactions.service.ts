// src/transactions/transactions.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterTransactionDto } from './dto/register-transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';
import { SeatStatus } from '@prisma/client';

const CONDITION = []

@Injectable()
export class TransactionsService {
    constructor(private readonly prisma: PrismaService) { }


    async registerPaymentTransaction(dto: RegisterTransactionDto) {
        const { paymentOrderId, userId, referenceNumber, bankName, receiptPath, amount, method } = dto;
        const now = new Date();

        return await this.prisma.$transaction(async (tx) => {
            // 1. Obtener la orden de pago con los asientos asociados
            const order = await tx.paymentOrder.findUnique({
                where: { id: paymentOrderId },
                include: { eventSeats: true },
            });

            if (!order) throw new NotFoundException('Orden de pago no encontrada.');
            if (order.userId !== userId) throw new ForbiddenException('No tienes permiso para esta orden.');

            // 2. Validar que la reserva no haya expirado (10 minutos)
            const firstSeat = order.eventSeats[0];
            if (!firstSeat || (firstSeat.expiresAt && firstSeat.expiresAt < now)) {
                throw new BadRequestException('El tiempo de reserva (10 minutos) ha expirado. Por favor, vuelve a seleccionar los asientos.');
            }

            // 3. Registrar la Transacción en estado 'pending'
            const transaction = await tx.transaction.create({
                data: {
                    paymentOrderId: order.id,
                    userId,
                    studentId: order.studentId,
                    concept: order.concept,
                    amount,
                    method,
                    referenceNumber,
                    bankName,
                    receiptPath,
                    status: 'pending',
                },
            });

            // 4. Cambiar estado de asientos a 'payment_pending' para congelar la expiración mientras aprueba el Admin
            await tx.eventSeat.updateMany({
                where: { paymentOrderId: order.id },
                data: {
                    status: SeatStatus.payment_pending,
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
    async create(createTransactionDto: CreateTransactionDto) {
        // Validamos primero que el alumno realmente exista
        const studentExists = await this.prisma.student.findUnique({
            where: { id: createTransactionDto.userId },
        });
        if (!studentExists) {
            throw new NotFoundException('El alumno especificado no existe.');
        }

        return this.prisma.transaction.create({
            data: createTransactionDto,
            include: { user: true },
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
            where.userId = userId;
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
                    user: {
                        select: { name: true, email: true, dni: true, phone: true },
                    },
                    student: true,
                },
            }),
            this.prisma.transaction.count({ where }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: transactions.map(tx => ({
                id: tx.id,
                realId: tx.id,
                student: tx.student,
                user: tx.user,
                concept: tx.concept,
                amount: Number(tx.amount),
                method: tx.method,
                receiptPath: tx.receiptPath,
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
            include: { user: true },
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
            data: updateTransactionDto,
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
        });

        if (!transaction) {
            throw new NotFoundException('La transacción especificada no existe.');
        }

        if (transaction.status === 'approved') {
            throw new BadRequestException('Esta transacción ya ha sido aprobada previamente.');
        }

        // 2. Si el concepto es matrícula (tuition), obligamos a que venga un groupId
        if (transaction.concept === 'tuition' && !groupId) {
            throw new BadRequestException('Para aprobar una matrícula debes asignar un grupo académico.');
        }

        try {
            // Executamos en una transacción de base de datos
            return await this.prisma.$transaction(async (tx) => {

                // Paso A: Actualizar el estado de la Transacción a aprobado
                const updatedTransaction = await tx.transaction.update({
                    where: { id: transactionId },
                    data: { status: 'approved' },
                });

                // Paso B: Actualizar la Orden de Pago relacionada (si existe relación en tu esquema)
                /* if (transaction.paymentOrderId) {
                    await tx.paymentOrder.update({
                        where: { id: transaction.paymentOrderId },
                        data: { status: 'approved' },
                    });
                } */

                // Paso C: Si es Matrícula, inscribimos al estudiante en el grupo asignado
                if (transaction.concept === 'tuition' && groupId && transaction.studentId) {
                    const group = await this.prisma.group.findUnique({
                        where: { id: groupId },
                        include: {
                            students: true
                        }
                    });

                    if (!group) {
                        throw new NotFoundException('El grupo especificada no existe.');
                    }

                    if (group.totalNumberOfSlots == group.students.length) {
                        throw new NotFoundException('Grupo sin cupos disponibles.');
                    }

                    const student = await tx.student.update({
                        where: { id: transaction.studentId },
                        data: { groupId: group.id }, // Asignamos el id del grupo elegido en el modal
                    });
                    if (!student) {
                        throw new NotFoundException('El estudiante no existe.');
                    }
                    await tx.registration.updateMany({
                        where: { studentId: student.id, status: 'pending' },
                        data: {
                            status: 'approved', groupId: group.id
                        }
                    });
                }

                return {
                    message: 'Transacción aprobada con éxito y estudiante matriculado.',
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