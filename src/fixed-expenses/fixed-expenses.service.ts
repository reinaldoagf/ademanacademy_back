// /back/src/fixed-expenses/fixed-expenses.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, PayableStatus } from '@prisma/client';
import { GetFixedExpensesFilterDto } from './dto/get-fixed-expenses-filter.dto';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto';

@Injectable()
export class FixedExpensesService {
    private readonly logger = new Logger(FixedExpensesService.name);

    constructor(private prisma: PrismaService) { }

    // CRUD Básico para el Admin
    async create(dto: CreateFixedExpenseDto) {
        return await this.prisma.fixedExpense.create({
            data: {
                title: dto.title,
                description: dto.description,
                amount: dto.amount,
                frequency: dto.frequency,
                nextDueDate: new Date(dto.nextDueDate),
                supplierId: dto.supplierId && dto.supplierId?.length > 0 ? dto.supplierId : null,
            },
        });
    }

    async findAll(filters: GetFixedExpensesFilterDto) {
        const {
            page = 1,
            limit = 10,
            search,
        } = filters;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where: Prisma.FixedExpenseWhereInput = {};
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { supplier: { name: { contains: search } } },
            ];
        }
        const [totalItems, data] = await Promise.all([
            this.prisma.fixedExpense.count({ where }),
            this.prisma.fixedExpense.findMany({
                include: { supplier: true },
                orderBy: { createdAt: 'desc' },
                where,
                skip,
                take,
            }),
        ]);

        return {
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
            },
            data,
        };
    }

    async update(id: string, dto: UpdateFixedExpenseDto) {
        const currentFixedExpense = await this.prisma.fixedExpense.findUnique({
            where: { id },
        });

        if (!currentFixedExpense) throw new NotFoundException('Evento no encontrado');
        return await this.prisma.fixedExpense.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                amount: dto.amount,
                frequency: dto.frequency,
                nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : currentFixedExpense.nextDueDate,
                isActive: dto.isActive,
                supplierId: dto.supplierId && dto.supplierId?.length > 0 ? dto.supplierId : currentFixedExpense.supplierId,
            },
        });
    }

    async remove(id: string) {
        return await this.prisma.fixedExpense.delete({ where: { id } });
    }

    // 🔄 Tarea Programada: Genera Cuentas por Pagar y notifica al Admin
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async processRecurringFixedExpenses() {
        this.logger.log('Verificando gastos fijos para generar cuentas por pagar...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Buscamos gastos fijos activos cuya fecha de vencimiento/emisión sea hoy o anterior
        const dueExpenses = await this.prisma.fixedExpense.findMany({
            where: {
                isActive: true,
                nextDueDate: {
                    lte: today,
                },
            },
            include: { supplier: true },
        });

        for (const expense of dueExpenses) {
            await this.prisma.$transaction(async (tx) => {
                // 1. Crear la Cuenta por Pagar correspondiente
                await tx.accountPayable.create({
                    data: {
                        supplierId: expense.supplierId,
                        supplierName: expense.supplier?.name || 'Proveedor General / Interno',
                        supplierDni: expense.supplier?.dni || 'N/A',
                        concept: `Gasto Fijo: ${expense.title} (${expense.frequency})`,
                        amountTotal: Number(expense.amount),
                        amountRemaining: Number(expense.amount),
                        issueDate: today,
                        dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 días de plazo por defecto
                        status: PayableStatus.Pendiente,
                        notes: expense.description || 'Generado automáticamente por el sistema de gastos fijos.',
                    },
                });

                // 2. Calcular la Siguiente Fecha (nextDueDate) basada en la frecuencia
                const nextDate = new Date(expense.nextDueDate);
                switch (expense.frequency) {
                    case 'Semanal':
                        nextDate.setDate(nextDate.getDate() + 7);
                        break;
                    case 'Quincenal':
                        nextDate.setDate(nextDate.getDate() + 15);
                        break;
                    case 'Mensual':
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        break;
                    case 'Anual':
                        nextDate.setFullYear(nextDate.getFullYear() + 1);
                        break;
                }

                // 3. Actualizar el gasto fijo con la nueva fecha para el siguiente ciclo
                await tx.fixedExpense.update({
                    where: { id: expense.id },
                    data: { nextDueDate: nextDate },
                });
            });

            this.logger.log(`[GASTO FIJO GENERADO] Cuenta por pagar creada para: "${expense.title}"`);

            // Opcional: Aquí puedes disparar una notificación en tiempo real a los administradores
            // Ej: await this.notificationsService.notifyAdmins('Nuevo Gasto Fijo por Pagar', `Se ha generado la cuenta por pagar de ${expense.title}`);
        }
    }
}