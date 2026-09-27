// event-seats.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*', // En producción ajusta a tu dominio de Next.js
    },
})
export class EventSeatsGateway {
    private readonly logger = new Logger(EventSeatsGateway.name);
    @WebSocketServer()
    server: Server;

    // Permitir que el cliente se una a una "sala" (room) específica del evento
    @SubscribeMessage('joinEventRoom')
    handleJoinRoom(
        @MessageBody() data: { eventId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.join(`event_${data.eventId}`);
    }

    @SubscribeMessage('leaveEventRoom')
    handleLeaveRoom(
        @MessageBody() data: { eventId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.leave(`event_${data.eventId}`);
    }

    @SubscribeMessage('joinUserRoom')
    handleJoinUserRoom(
        @MessageBody() data: { targetId: string }, // Cambiado a targetId
        @ConnectedSocket() client: Socket,
    ) {
        this.logger.log(`Cliente ${client.id} se unió a la sala user_${data.targetId}`);
        client.join(`user_${data.targetId}`);
    }

    @SubscribeMessage('leaveUserRoom')
    handleLeaveUserRoom(
        @MessageBody() data: { targetId: string }, // Cambiado a targetId
        @ConnectedSocket() client: Socket,
    ) {
        client.leave(`user_${data.targetId}`);
    }

    // Método para emitir la liberación o cambio de estado de asientos
    emitSeatsUpdated(eventId: string, updatedSeats: any[]) {
        this.server.to(`event_${eventId}`).emit('seatsUpdated', {
            eventId,
            seats: updatedSeats,
        });
    }

    /**
     * Emite la cancelación/eliminación global o general de órdenes de pago
     * Útil para notificar a administradores o dashboards generales
     */
    emitPaymentOrdersCancelled(payload: {
        paymentOrderIds: string[];
        reason: string;
    }) {
        this.server.emit('paymentOrdersCancelled', payload);
    }

    /**
     * Emite una notificación directamente al canal o sala privada de un cliente/usuario
     * informando sobre cambios o eliminación en sus órdenes de pago.
     */
    emitUserPaymentOrdersUpdated(
        targetId: string,
        payload: {
            action: 'DELETED' | 'UPDATED' | 'CREATED';
            paymentOrderIds: string[];
        },
    ) {
        this.logger.log(`user_${targetId}`, `userPaymentOrdersUpdated ${JSON.stringify(payload)}`);
        this.server.to(`user_${targetId}`).emit('userPaymentOrdersUpdated', payload);
    }
}