// event-seats.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*', // En producción ajusta a tu dominio de Next.js
    },
})
export class EventSeatsGateway {
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

    // Método para emitir la liberación o cambio de estado de asientos
    emitSeatsUpdated(eventId: string, updatedSeats: any[]) {
        this.server.to(`event_${eventId}`).emit('seatsUpdated', {
            eventId,
            seats: updatedSeats,
        });
    }
}