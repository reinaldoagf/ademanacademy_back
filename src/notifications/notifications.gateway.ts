import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        const userId = client.handshake.query.userId as string;
        if (userId) {
            client.join(`user_${userId}`);
        }
    }

    handleDisconnect(client: Socket) {
        // Manejo de desconexión si es requerido
    }

    // Notificar a un usuario específico en tiempo real
    emitToUser(userId: string, notification: any) {
        this.server.to(`user_${userId}`).emit('notification', notification);
    }

    // Notificar a todos los administradores
    emitToAdmins(notification: any) {
        this.server.emit('admin_notification', notification);
    }
}