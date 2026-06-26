// src/transactions/transactions.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions-filter.dto';

@Injectable()
export class TransactionsService {
    constructor(private readonly prisma: PrismaService) { }

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
    async findAll(filters: GetTransactionsFilterDto) {
        const { page = 1, limit = 10, search, concept } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (concept) {
            where.concept = concept;
        }

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
            };
        }

        const [transactions, totalItems] = await Promise.all([
            this.prisma.transaction.findMany({
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
            this.prisma.transaction.count({ where }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);


        // Adaptamos la respuesta para que encaje perfectamente con la UI genérica
        return {
            data: transactions.map(tx => ({
                id: tx.id, // Máscara estética parecida a tu mock (TX-901)
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
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
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