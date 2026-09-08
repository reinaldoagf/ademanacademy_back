// event-seats.service.ts
import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
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
            await tx.eventSeat.updateMany({
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
    async reserveOrBuySeats(dto: ReserveSeatsDto) {
        const { eventId, seatingMapElementIds, status, userId, clientId, totalAmount } = dto;
        const now = new Date();
        const expiresAt = status === SeatStatus.reserved ? new Date(now.getTime() + 10 * 60 * 1000) : null;

        return await this.prisma.$transaction(async (tx) => {
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

                    // Si la reserva sigue vigente (expiresAt > now) y pertenece a otro usuario
                    const isReservationActive = currentSeat.expiresAt && currentSeat.expiresAt > now;
                    const isDifferentUser = currentSeat.userId !== userId;

                    if (
                        (currentSeat.status === SeatStatus.reserved || currentSeat.status === SeatStatus.payment_pending) &&
                        isReservationActive &&
                        isDifferentUser
                    ) {
                        throw new ConflictException(`El asiento "${elementId}" está reservado por otro usuario.`);
                    }
                }
            }

            // 2. Crear Orden de Pago si es una Reserva
            let paymentOrder: Awaited<ReturnType<typeof tx.paymentOrder.create>> | null = null;
            if (status === SeatStatus.reserved) {
                paymentOrder = await tx.paymentOrder.create({
                    data: {
                        userId,
                        clientId: clientId || null,
                        concept: ConceptType.ticket, // Cambia por tu enum de concepto
                        amount: totalAmount,
                        status: PaymentOrderStatus.pending,
                    },
                });
            }

            // 3. Upsert de asientos vinculados a la PaymentOrder
            const operations = seatingMapElementIds.map((elementId) =>
                tx.eventSeat.upsert({
                    where: {
                        eventId_seatingMapElementId: { eventId, seatingMapElementId: elementId },
                    },
                    update: {
                        status,
                        reservedAt: now,
                        expiresAt,
                        userId: userId || null,
                        clientId: clientId || null,
                        paymentOrderId: paymentOrder ? paymentOrder.id : null,
                    },
                    create: {
                        eventId,
                        seatingMapElementId: elementId,
                        status,
                        reservedAt: now,
                        expiresAt,
                        userId: userId || null,
                        clientId: clientId || null,
                        paymentOrderId: paymentOrder ? paymentOrder.id : null,
                    },
                })
            );

            const result = await Promise.all(operations);

            return {
                message: 'Reserva realizada por 10 minutos',
                expiresAt,
                paymentOrderId: paymentOrder?.id,
                seats: result,
            };
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
            },
        });

        if (expiredSeats.length === 0) return;

        const expiredIds = expiredSeats.map((seat) => seat.id);

        // 2. Actualizar las reservas a disponible
        await this.prisma.eventSeat.updateMany({
            where: {
                id: { in: expiredIds },
            },
            data: {
                status: SeatStatus.available,
                userId: null,
                clientId: null,
                expiresAt: null,
                reservedAt: null,
            },
        });

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

        this.logger.log(`Se liberaron ${expiredSeats.length} reservas expiradas.`);
    }
}