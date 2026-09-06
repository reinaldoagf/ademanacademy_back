// event-seats.service.ts
import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ReserveSeatsDto } from './dto/reserve-seats.dto';
import { SeatStatus } from '@prisma/client';
import { EventSeatsGateway } from './event-seats.gateway';

@Injectable()
export class EventSeatsService {
    private readonly logger = new Logger(EventSeatsService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventSeatsGateway: EventSeatsGateway
    ) { }

    async reserveOrBuySeats(dto: ReserveSeatsDto) {
        const { eventId, seatingMapElementIds, status, userId, studentId } = dto;
        const now = new Date();
        // Vencimiento a 10 minutos
        const expiresAt = status === SeatStatus.reserved ? new Date(now.getTime() + 10 * 60 * 1000) : null;

        return await this.prisma.$transaction(async (tx) => {
            // 1. Consultar el estado actual de los asientos solicitados para este evento
            const existingSeats = await tx.eventSeat.findMany({
                where: {
                    eventId,
                    seatingMapElementId: { in: seatingMapElementIds },
                },
            });

            // 2. Verificar disponibilidad de cada elemento
            for (const elementId of seatingMapElementIds) {
                const currentSeat = existingSeats.find((s) => s.seatingMapElementId === elementId);

                if (currentSeat) {
                    // Si el asiento ya está VENDIDO
                    if (currentSeat.status === SeatStatus.sold) {
                        throw new ConflictException(`El asiento con ID "${elementId}" ya ha sido vendido.`);
                    }

                    // Si está RESERVADO pero la reserva aún es válida (y no pertenece al usuario actual)
                    const isReservationActive = currentSeat.expiresAt && currentSeat.expiresAt > now;
                    const isDifferentUser = currentSeat.userId !== userId;

                    if (currentSeat.status === SeatStatus.reserved && isReservationActive && isDifferentUser) {
                        throw new ConflictException(`El asiento con ID "${elementId}" está reservado por otro usuario.`);
                    }
                }
            }

            // 3. Crear o Actualizar las sillas usando 'upsert' por cada elemento seleccionado
            const operations = seatingMapElementIds.map((elementId) =>
                tx.eventSeat.upsert({
                    where: {
                        eventId_seatingMapElementId: {
                            eventId,
                            seatingMapElementId: elementId,
                        },
                    },
                    update: {
                        status,
                        reservedAt: now,
                        expiresAt,
                        userId: userId || null,
                        studentId: studentId || null,
                    },
                    create: {
                        eventId,
                        seatingMapElementId: elementId,
                        status,
                        reservedAt: now,
                        expiresAt,
                        userId: userId || null,
                        studentId: studentId || null,
                    },
                })
            );

            const result = await Promise.all(operations);

            // 4. Si la operación es una VENTA, actualizar contador de boletos del Evento
            if (status === SeatStatus.sold) {
                await tx.event.update({
                    where: { id: eventId },
                    data: {
                        ticketsSold: {
                            increment: seatingMapElementIds.length,
                        },
                    },
                });
            }

            return {
                message: status === SeatStatus.sold ? 'Venta procesada con éxito' : 'Reserva realizada por 10 minutos',
                count: result.length,
                seats: result,
            };
        });
    }

    // OPCIÓN 2 (ALT): Si prefieres conservar el historial y actualizar el estado a AVAILABLE:
    @Cron(CronExpression.EVERY_MINUTE)
    async handleExpiredReservationsUpdate() {
        const now = new Date();

        console.log('handleExpiredReservationsUpdate')

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
                studentId: null,
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