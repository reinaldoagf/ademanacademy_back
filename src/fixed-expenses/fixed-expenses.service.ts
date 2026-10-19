// /back/src/fixed-expenses/fixed-expenses.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, PayableStatus, NotificationChannel, NotificationStatus } from '@prisma/client';
import { GetFixedExpensesFilterDto } from './dto/get-fixed-expenses-filter.dto';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto';
import { NotificationsService } from '@/notifications/notifications.service';

@Injectable()
export class FixedExpensesService {
    private readonly logger = new Logger(FixedExpensesService.name);

    constructor(private prisma: PrismaService,
        private notificationsService: NotificationsService) { }

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

    // 🔄 Tarea Programada: Se ejecuta todos los días a la medianoche ('0 0 * * *')
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async processRecurringFixedExpenses() {
        this.logger.log('Iniciando verificación diaria de gastos fijos...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Buscamos gastos fijos activos cuya próxima fecha de vencimiento sea hoy o anterior
        const dueExpenses = await this.prisma.fixedExpense.findMany({
            where: {
                isActive: true,
                nextDueDate: {
                    lte: today,
                },
            },
            include: { supplier: true },
        });

        if (dueExpenses.length === 0) {
            this.logger.log('No hay gastos fijos pendientes de generación para el día de hoy.');
            return;
        }

        for (const expense of dueExpenses) {
            await this.prisma.$transaction(async (tx) => {
                // A. Calcular fecha límite de pago de la cuenta por pagar (ej: 7 días de plazo a partir de hoy)
                const paymentDueDate = new Date(today);
                paymentDueDate.setDate(paymentDueDate.getDate() + 7);

                // B. Crear la Cuenta por Pagar (AccountPayable)
                const accountPayable = await tx.accountPayable.create({
                    data: {
                        supplierId: expense.supplierId || null,
                        supplierName: expense.supplier?.name || 'Proveedor General / Interno',
                        supplierDni: expense.supplier?.dni || 'N/A',
                        concept: `Gasto Fijo: ${expense.title} (${expense.frequency})`,
                        amountTotal: Number(expense.amount),
                        amountPaid: 0,
                        amountRemaining: Number(expense.amount),
                        issueDate: today,
                        dueDate: paymentDueDate,
                        status: PayableStatus.Pendiente,
                        notes: expense.description || `Generado automáticamente por el sistema de gastos fijos: ${expense.title}`,
                    },
                });

                // C. Calcular la Siguiente Fecha (nextDueDate) basada en la frecuencia del gasto fijo
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

                // D. Actualizar el gasto fijo con la nueva fecha para el siguiente ciclo
                await tx.fixedExpense.update({
                    where: { id: expense.id },
                    data: { nextDueDate: nextDate },
                });

                this.logger.log(`[CUENTA POR PAGAR GENERADA] Creada para "${expense.title}" por monto de $${expense.amount}`);

                // E. Notificar a los Administradores
                // Buscamos a todos los usuarios administradores del sistema para notificarles
                const admins = await tx.user.findMany({
                    where: { isAdmin: true },
                });

                for (const admin of admins) {
                    await this.notificationsService.sendNotification({
                        userId: admin.id,
                        recipientPhone: admin.phone,
                        title: 'Nueva Cuenta por Pagar Generada 💳',
                        message: `Se ha generado automáticamente la cuenta por pagar para el gasto fijo "${expense.title}" por un monto de $${expense.amount}. Vence el ${paymentDueDate.toLocaleDateString('es-ES')}.`,
                        channel: NotificationChannel.En_la_App,
                        link: `/admin/account-payables`, // Enlace directo a la cuenta por pagar en el panel admin
                    });
                }
            });
        }

        this.logger.log('Proceso de gastos fijos finalizado con éxito.');
    }
}