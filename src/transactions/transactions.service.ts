// src/transactions/transactions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { ConceptType, PaymentMethod } from '@prisma/client';

// Diccionario para los métodos de pago
export const PaymentMethodLabel: Record<PaymentMethod, string> = {
    [PaymentMethod.transferencia]: 'Transferencia',
    [PaymentMethod.tarjeta]: 'Tarjeta',
    [PaymentMethod.efectivo]: 'Efectivo',
    [PaymentMethod.pago_movil]: 'Pago Móvil',
};

// Diccionario para los conceptos (por si también quieres traducirlos)
export const ConceptTypeLabel: Record<ConceptType, string> = {
    [ConceptType.mensualidad]: 'Mensualidad',
    [ConceptType.matricula]: 'Matrícula',
    [ConceptType.uniforme]: 'Uniforme',
    [ConceptType.entradas_gala]: 'Entradas Gala',
};
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
    async findAll(page: number = 1, limit: number = 10, search?: string) {
        const skip = (page - 1) * limit;

        // Clausura de búsqueda condicional
        const whereCondition = search
            ? {
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
            }
            : {};

        const [transactions, totalItems] = await Promise.all([
            this.prisma.transaction.findMany({
                where: whereCondition,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }, // Transacciones más recientes primero
                include: {
                    user: {
                        select: { name: true, email: true, dni: true },
                    },
                    student: true
                },
            }),
            this.prisma.transaction.count({ where: whereCondition }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        console.log({ transactions })

        // Adaptamos la respuesta para que encaje perfectamente con la UI genérica
        return {
            data: transactions.map(tx => ({
                id: `TX-${tx.id.substring(0, 4).toUpperCase()}`, // Máscara estética parecida a tu mock (TX-901)
                realId: tx.id,
                student: tx.student,
                user: tx.user,
                concept: ConceptTypeLabel[tx.concept],
                amount: Number(tx.amount),
                method: PaymentMethodLabel[tx.method],
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
}