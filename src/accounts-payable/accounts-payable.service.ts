import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta a tu PrismaService
import { CreateAccountPayableDto } from './dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/update-account-payable.dto';
import { FilterAccountPayableDto } from './dto/filter-account-payable.dto';
import { CreatePayablePaymentDto } from './dto/create-payable-payment.dto';
import { PayableStatus, Prisma } from '@prisma/client';

@Injectable()
export class AccountsPayableService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Crear una nueva Cuenta por Pagar (CXP)
     */
    async create(dto: CreateAccountPayableDto) {
        const amountTotal = dto.amountTotal;

        return await this.prisma.accountPayable.create({
            data: {
                supplierName: dto.supplierName,
                supplierDni: dto.supplierDni,
                invoiceNumber: dto.invoiceNumber,
                concept: dto.concept,
                amountTotal: amountTotal,
                amountPaid: 0,
                amountRemaining: amountTotal,
                dueDate: new Date(dto.dueDate),
                status: PayableStatus.pending,
                notes: dto.notes,
            },
        });
    }

    /**
     * Obtener lista paginada y filtrada de Cuentas por Pagar
     */
    async findAll(filters: FilterAccountPayableDto) {
        const { page = 1, limit = 10, search, status } = filters;
        const skip = (page - 1) * limit;

        const where: Prisma.AccountPayableWhereInput = {};

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { supplierName: { contains: search } },
                { supplierDni: { contains: search } },
                { concept: { contains: search } },
                { invoiceNumber: { contains: search } },
            ];
        }

        const [data, totalItems] = await Promise.all([
            this.prisma.accountPayable.findMany({
                where,
                skip,
                take: limit,
                orderBy: { dueDate: 'asc' },
                include: {
                    _count: {
                        select: { payments: true },
                    },
                },
            }),
            this.prisma.accountPayable.count({ where }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            success: true,
            data,
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            },
        };
    }

    /**
     * Obtener el detalle de una CXP con su historial de abonos
     */
    async findOne(id: string) {
        const payable = await this.prisma.accountPayable.findUnique({
            where: { id },
            include: {
                payments: {
                    orderBy: { paymentDate: 'desc' },
                },
            },
        });

        if (!payable) {
            throw new NotFoundException(`Cuenta por pagar con ID ${id} no encontrada`);
        }

        return payable;
    }

    /**
     * Actualizar datos básicos de una CXP
     */
    async update(id: string, dto: UpdateAccountPayableDto) {
        const existing = await this.findOne(id);

        // Validar que el nuevo monto total no sea inferior a lo ya abonado
        let amountTotal = existing.amountTotal;
        if (dto.amountTotal !== undefined) {
            if (dto.amountTotal < existing.amountPaid) {
                throw new BadRequestException(
                    `El nuevo monto total (${dto.amountTotal}) no puede ser inferior a lo ya abonado (${existing.amountPaid})`
                );
            }
            amountTotal = dto.amountTotal;
        }

        const amountRemaining = amountTotal - existing.amountPaid;

        let newStatus = existing.status;
        if (amountRemaining === 0) {
            newStatus = PayableStatus.paid;
        } else if (existing.amountPaid > 0) {
            newStatus = PayableStatus.partial;
        } else {
            newStatus = PayableStatus.pending;
        }

        return await this.prisma.accountPayable.update({
            where: { id },
            data: {
                ...dto,
                amountTotal,
                amountRemaining,
                status: newStatus,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            },
        });
    }

    /**
     * Registrar un abono/pago a una Cuenta por Pagar
     */
    async addPayment(id: string, dto: CreatePayablePaymentDto) {
        const payable = await this.findOne(id);

        if (payable.status === PayableStatus.paid) {
            throw new BadRequestException('Esta cuenta por pagar ya fue saldada por completo');
        }

        if (payable.status === PayableStatus.cancelled) {
            throw new BadRequestException('No se pueden registrar pagos a una cuenta cancelada');
        }

        if (dto.amount > payable.amountRemaining) {
            throw new BadRequestException(
                `El monto del abono (${dto.amount}) excede el saldo pendiente (${payable.amountRemaining})`
            );
        }

        // Transacción atómica: Crear el abono y actualizar montos/estado de la CXP
        return await this.prisma.$transaction(async (tx) => {
            const payment = await tx.payablePayment.create({
                data: {
                    accountPayableId: id,
                    amount: dto.amount,
                    method: dto.method,
                    paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
                    referenceNumber: dto.referenceNumber,
                    receiptUrl: dto.receiptUrl,
                    notes: dto.notes,
                },
            });

            const newAmountPaid = payable.amountPaid + dto.amount;
            const newAmountRemaining = payable.amountTotal - newAmountPaid;

            const newStatus =
                newAmountRemaining === 0 ? PayableStatus.paid : PayableStatus.partial;

            const updatedPayable = await tx.accountPayable.update({
                where: { id },
                data: {
                    amountPaid: newAmountPaid,
                    amountRemaining: newAmountRemaining,
                    status: newStatus,
                },
                include: {
                    payments: {
                        orderBy: { paymentDate: 'desc' },
                    },
                },
            });

            return {
                payment,
                accountPayable: updatedPayable,
            };
        });
    }

    /**
     * Anular/Cancelar una Cuenta por Pagar
     */
    async cancel(id: string) {
        const payable = await this.findOne(id);

        if (payable.amountPaid > 0) {
            throw new BadRequestException(
                'No se puede cancelar una cuenta por pagar que ya posee abonos registrados'
            );
        }

        return await this.prisma.accountPayable.update({
            where: { id },
            data: { status: PayableStatus.cancelled },
        });
    }

    /**
     * Eliminar una CXP
     */
    async remove(id: string) {
        await this.findOne(id);
        return await this.prisma.accountPayable.delete({
            where: { id },
        });
    }
}