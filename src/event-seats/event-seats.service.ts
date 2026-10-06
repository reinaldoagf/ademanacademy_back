// event-seats.service.ts
import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ClientPurchaseSeatsDto } from './dto/client-purchase-seats.dto';
import { ReserveSeatsDto } from './dto/reserve-seats.dto';
import { ConceptType, PaymentOrderStatus, SeatStatus } from '@prisma/client';
import { EventSeatsGateway } from './event-seats.gateway';

@Injectable()
export class EventSeatsService {
    private readonly logger = new Logger(EventSeatsService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventSeatsGateway: EventSeatsGateway
    ) { }
    async clientPurchaseSeats(
        userId: string,
        dto: {
            eventId: string;
            seatingMapElementIds: string[];
            totalAmount: number;
            bankName: string;
            referenceNumber: string;
        },
        receiptPath: string, // 'receipt-1790488217862-902425808.jpeg'
    ) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
        });
        const isAdmin = user?.isAdmin ?? false;
        if (!isAdmin && dto.totalAmount <= 0) {
            throw new BadRequestException('El monto debe ser mayor a cero.');
        }
        const { eventId, seatingMapElementIds, totalAmount, bankName, referenceNumber } = dto;
        const now = new Date();

        return await this.prisma.$transaction(
            async (tx) => {
                // 1. Obtener cliente
                const client = await tx.client.findFirst({
                    where: { userId },
                });

                if (!client) {
                    throw new NotFoundException('No se encontró el perfil de cliente para este usuario.');
                }

                // 2. Validar disponibilidad
                const existingSeats = await tx.eventSeat.findMany({
                    where: {
                        eventId,
                        seatingMapElementId: { in: seatingMapElementIds },
                    },
                });

                for (const elementId of seatingMapElementIds) {
                    const currentSeat = existingSeats.find((s) => s.seatingMapElementId === elementId);

                    if (currentSeat) {
                        if (currentSeat.status === SeatStatus.sold) {
                            throw new ConflictException(`El asiento "${elementId}" ya ha sido vendido.`);
                        }

                        const isReservationActive = currentSeat.expiresAt && currentSeat.expiresAt > now;
                        const isDifferentClient = currentSeat.clientId !== client.id;

                        if (
                            (currentSeat.status === SeatStatus.reserved ||
                                currentSeat.status === SeatStatus.payment_pending) &&
                            (isReservationActive || currentSeat.expiresAt === null) &&
                            isDifferentClient
                        ) {
                            throw new ConflictException(
                                `El asiento "${elementId}" ya está reservado o en verificación por otro usuario.`,
                            );
                        }
                    }
                }

                // 3. Crear Orden de Pago (pending)
                const paymentOrder = await tx.paymentOrder.create({
                    data: {
                        registeringUserId: userId,
                        clientId: client.id,
                        concept: ConceptType.ticket,
                        amount: totalAmount,
                        status: PaymentOrderStatus.pending,
                    },
                });

                // 4. Registrar Transacción con la imagen recibida
                await tx.transaction.create({
                    data: {
                        registeringUserId: userId,
                        clientId: client.id,
                        paymentOrderId: paymentOrder.id,
                        concept: ConceptType.ticket,
                        amount: totalAmount,
                        method: 'bank_transfer',
                        status: 'pending',
                        bankName: bankName,
                        referenceNumber: referenceNumber,
                        receiptPath: receiptPath,
                    },
                });

                // 5. Reservar asientos con estado 'reserved'
                const existingElementIds = new Set(existingSeats.map((s) => s.seatingMapElementId));
                const newElementIds = seatingMapElementIds.filter((id) => !existingElementIds.has(id));

                const seatDataCommon = {
                    status: SeatStatus.reserved, // 👈 Cambiado a 'reserved' igual que en reserveOrBuySeats
                    reservedAt: now,
                    expiresAt: null, // O define una fecha si expira la reserva
                    userId: userId,
                    clientId: client.id,
                    paymentOrderId: paymentOrder.id,
                };

                // A. Crear asientos nuevos
                if (newElementIds.length > 0) {
                    await tx.eventSeat.createMany({
                        data: newElementIds.map((elementId) => ({
                            eventId,
                            seatingMapElementId: elementId,
                            ...seatDataCommon,
                        })),
                    });
                }

                // B. Actualizar asientos existentes
                if (existingElementIds.size > 0) {
                    await tx.eventSeat.updateMany({
                        where: {
                            eventId,
                            seatingMapElementId: { in: Array.from(existingElementIds) },
                        },
                        data: seatDataCommon,
                    });
                }

                const updatedSeats = await tx.eventSeat.findMany({
                    where: {
                        eventId,
                        seatingMapElementId: { in: seatingMapElementIds },
                    },
                });

                return {
                    message: 'Solicitud enviada con éxito. En espera de verificación del comprobante.',
                    paymentOrderId: paymentOrder.id,
                    seats: updatedSeats,
                };
            },
            { timeout: 15000 },
        );
    }
    async approvePaymentTransaction(transactionId: string) {
        return await this.prisma.$transaction(async (tx) => {
            // 1. Buscar la transacción con su orden de pago
            const transaction = await tx.transaction.findUnique({
                where: { id: transactionId },
                include: {
                    paymentOrder: {
                        include: { eventSeats: true },
                    },
                },
            });

            if (!transaction) throw new NotFoundException('Transacción no encontrada.');
            if (transaction.status === 'approved') throw new BadRequestException('La transacción ya fue aprobada previamente.');

            const paymentOrder = transaction.paymentOrder;
            if (!paymentOrder) throw new BadRequestException('La transacción no tiene una orden de pago vinculada.');

            // 2. Marcar Transacción como aprobada
            await tx.transaction.update({
                where: { id: transactionId },
                data: { status: 'approved' },
            });

            // 3. Marcar Orden de Pago como completada
            await tx.paymentOrder.update({
                where: { id: paymentOrder.id },
                data: { status: 'paid' },
            });

            // 4. Pasar los Asientos a estado 'sold'
            const updated = await tx.eventSeat.updateMany({
                where: { paymentOrderId: paymentOrder.id },
                data: {
                    status: SeatStatus.sold,
                    expiresAt: null,
                },
            });

            // 5. Incrementar contador de tickets en el evento
            const eventId = paymentOrder.eventSeats[0]?.eventId;
            if (eventId) {
                await tx.event.update({
                    where: { id: eventId },
                    data: {
                        ticketsSold: {
                            increment: paymentOrder.eventSeats.length,
                        },
                    },
                });
            }

            return {
                message: 'Venta completada con éxito. Los asientos ahora están registrados como VENDIDOS.',
                seatsCount: paymentOrder.eventSeats.length,
            };
        });
    }
    async reserveOrBuySeats(registeringUserId: string, dto: ReserveSeatsDto) {
        const user = await this.prisma.user.findFirst({
            where: { id: registeringUserId },
        });
        const isAdmin = user?.isAdmin ?? false;
        if (!isAdmin && dto.totalAmount <= 0) {
            throw new BadRequestException('El monto debe ser mayor a cero.');
        }
        const { eventId, seatingMapElementIds, status, clientId, totalAmount, reservationDurationMinutes = 10 } = dto;
        const now = new Date();
        const expiresAt = status === SeatStatus.reserved
            ? new Date(now.getTime() + reservationDurationMinutes * 60 * 1000)
            : null;

        if (!clientId) {
            throw new BadRequestException('El ID del cliente es obligatorio para realizar la reserva.');
        }

        // Aumentamos el timeout a 15000 ms por seguridad operativa
        return await this.prisma.$transaction(async (tx) => {
            const client = await tx.client.findUnique({
                where: { id: clientId },
            });

            if (!client) {
                throw new NotFoundException(`Cliente con ID ${clientId} no fue encontrado.`);
            }

            // 1. Validar disponibilidad
            const existingSeats = await tx.eventSeat.findMany({
                where: {
                    eventId,
                    seatingMapElementId: { in: seatingMapElementIds },
                },
            });

            for (const elementId of seatingMapElementIds) {
                const currentSeat = existingSeats.find((s) => s.seatingMapElementId === elementId);

                if (currentSeat) {
                    if (currentSeat.status === SeatStatus.sold) {
                        throw new ConflictException(`El asiento "${elementId}" ya ha sido vendido.`);
                    }

                    const isReservationActive = currentSeat.expiresAt && currentSeat.expiresAt > now;
                    const isDifferentClient = currentSeat.clientId !== clientId;

                    if (
                        (currentSeat.status === SeatStatus.reserved || currentSeat.status === SeatStatus.payment_pending) &&
                        isReservationActive &&
                        isDifferentClient
                    ) {
                        throw new ConflictException(`El asiento "${elementId}" está reservado por otro usuario.`);
                    }
                }
            }

            // 2. Crear Orden de Pago si es una Reserva
            let paymentOrder: Awaited<ReturnType<typeof tx.paymentOrder.create>> | null = null;

            paymentOrder = await tx.paymentOrder.create({
                data: {
                    registeringUserId: registeringUserId,
                    clientId: client.id,
                    concept: ConceptType.ticket,
                    amount: totalAmount,
                    status: status === SeatStatus.reserved ? PaymentOrderStatus.pending : PaymentOrderStatus.paid,
                },
            });


            // 3. SEPARAR Y EJECUTAR OPERACIONES EN LOTE (REEMPLAZO DE UPSERT)
            const existingElementIds = new Set(existingSeats.map((s) => s.seatingMapElementId));
            const newElementIds = seatingMapElementIds.filter((id) => !existingElementIds.has(id));

            const seatDataCommon = {
                status,
                reservedAt: now,
                expiresAt,
                userId: client.userId ?? null,
                clientId: client.id,
                paymentOrderId: paymentOrder ? paymentOrder.id : null,
            };

            // A. Crear asientos que NO existían previamente (1 sola query SQL)
            if (newElementIds.length > 0) {
                await tx.eventSeat.createMany({
                    data: newElementIds.map((elementId) => ({
                        eventId,
                        seatingMapElementId: elementId,
                        ...seatDataCommon,
                    })),
                });
            }

            // B. Actualizar asientos que YA existían (1 sola query SQL)
            if (existingElementIds.size > 0) {
                await tx.eventSeat.updateMany({
                    where: {
                        eventId,
                        seatingMapElementId: { in: Array.from(existingElementIds) },
                    },
                    data: seatDataCommon,
                });
            }

            // 4. Retornar los asientos actualizados
            const updatedSeats = await tx.eventSeat.findMany({
                where: {
                    eventId,
                    seatingMapElementId: { in: seatingMapElementIds },
                },
            });

            return {
                message: status === SeatStatus.reserved
                    ? `Reserva realizada por ${reservationDurationMinutes} minutos`
                    : 'Compra procesada exitosamente',
                expiresAt,
                paymentOrderId: paymentOrder?.id,
                seats: updatedSeats,
            };
        }, {
            timeout: 15000, // Timeout extendido de respaldo
        });
    }
    // OPCIÓN 2 (ALT): Si prefieres conservar el historial y actualizar el estado a AVAILABLE:
    @Cron(CronExpression.EVERY_MINUTE)
    async handleExpiredReservationsUpdate() {
        const now = new Date();
        // 1. Buscar las reservas que están a punto de expirar antes de actualizarlas
        const expiredSeats = await this.prisma.eventSeat.findMany({
            where: {
                status: SeatStatus.reserved,
                expiresAt: {
                    lte: now,
                },
            },
            select: {
                id: true,
                eventId: true,
                seatingMapElementId: true,
                paymentOrderId: true,
                userId: true,     // Capturamos el usuario
                clientId: true,   // Capturamos el cliente/sesión si aplica
            },
        });

        if (expiredSeats.length === 0) return;

        const expiredIds = expiredSeats.map((seat) => seat.id);

        // 1. Obtener los asientos que expiraron JUNTO con sus paymentOrderId antes de limpiar las relaciones
        const seatsToRelease = await this.prisma.eventSeat.findMany({
            where: {
                id: { in: expiredIds },
            },
            select: {
                id: true,
                paymentOrderId: true,
            },
        });

        // Extraer los IDs únicos de paymentOrder que no sean nulos
        const paymentOrderIdsToDelete = Array.from(
            new Set(
                seatsToRelease
                    .map((seat) => seat.paymentOrderId)
                    .filter((id): id is string => Boolean(id))
            )
        );
        // Mapeo opcional para notificar por usuario o cliente afectado
        const affectedUsersMap = expiredSeats.reduce((acc, seat) => {
            const targetId = seat.userId;
            if (targetId && seat.paymentOrderId) {
                if (!acc[targetId]) acc[targetId] = [];
                if (!acc[targetId].includes(seat.paymentOrderId)) {
                    acc[targetId].push(seat.paymentOrderId);
                }
            }
            return acc;
        }, {} as Record<string, string[]>);
        // 2. Ejecutar la actualización y la eliminación en una transacción de Prisma
        const [updatedSeatsCount, deletedPaymentOrders] = await this.prisma.$transaction([
            // A. Desvincular y actualizar el estado de los asientos expirados
            this.prisma.eventSeat.updateMany({
                where: {
                    id: { in: expiredIds },
                },
                data: {
                    status: SeatStatus.available,
                    userId: null,
                    clientId: null,
                    expiresAt: null,
                    reservedAt: null,
                    paymentOrderId: null, // Limpiamos la referencia a la orden de pago
                },
            }),

            // B. Eliminar las órdenes de pago asociadas (o actualizar su status a 'cancelled')
            this.prisma.paymentOrder.deleteMany({
                where: {
                    id: { in: paymentOrderIdsToDelete },
                },
            }),
        ]);


        // 3. Agrupar por eventId y transmitir el evento en tiempo real
        const seatsByEvent = expiredSeats.reduce((acc, seat) => {
            if (!acc[seat.eventId]) acc[seat.eventId] = [];
            acc[seat.eventId].push({
                seatingMapElementId: seat.seatingMapElementId,
                status: SeatStatus.available,
            });
            return acc;
        }, {} as Record<string, Array<{ seatingMapElementId: string; status: SeatStatus }>>);

        // Emitir a la sala de WebSocket correspondiente a cada evento
        Object.entries(seatsByEvent).forEach(([eventId, seats]) => {
            this.eventSeatsGateway.emitSeatsUpdated(eventId, seats);
        });

        // B. Emitir evento de órdenes eliminadas/canceladas a los clientes afectados
        if (paymentOrderIdsToDelete.length > 0) {

            // 1. Si emites un evento global/sala de ordenes
            this.eventSeatsGateway.emitPaymentOrdersCancelled({
                paymentOrderIds: paymentOrderIdsToDelete,
                reason: "RESERVATION_EXPIRED",
            });

            // 2. O si notificas a la sala privada de cada usuario/cliente
            Object.entries(affectedUsersMap).forEach(([targetId, orderIds]) => {
                this.eventSeatsGateway.emitUserPaymentOrdersUpdated(targetId, {
                    action: "DELETED",
                    paymentOrderIds: orderIds,
                });
            });
        }

        this.logger.log(`Se liberaron ${expiredSeats.length} reservas expiradas.`);
    }
}