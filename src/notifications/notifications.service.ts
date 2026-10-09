import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private prisma: PrismaService,
        private notificationsGateway: NotificationsGateway,
    ) { }

    // 1. Crear y enviar notificación
    async sendNotification(dto: {
        userId?: string;
        recipientPhone?: string;
        title: string;
        message: string;
        channel?: NotificationChannel;
        metadata?: any;
    }) {
        const channel = dto.channel || NotificationChannel.IN_APP;

        // A. Registrar en base de datos
        const notification = await this.prisma.notification.create({
            data: {
                userId: dto.userId,
                recipientPhone: dto.recipientPhone,
                title: dto.title,
                message: dto.message,
                channel,
                status: NotificationStatus.PENDING,
                metadata: dto.metadata,
            },
        });

        // B. Enviar en tiempo real (In-App)
        if (channel === NotificationChannel.IN_APP || channel === NotificationChannel.BOTH) {
            if (dto.userId) {
                this.notificationsGateway.emitToUser(dto.userId, notification);
            } else {
                this.notificationsGateway.emitToAdmins(notification);
            }
        }

        // C. Enviar por WhatsApp
        if (channel === NotificationChannel.WHATSAPP || channel === NotificationChannel.BOTH) {
            if (dto.recipientPhone) {
                await this.sendWhatsAppMessage(dto.recipientPhone, dto.message, notification.id);
            }
        }

        return notification;
    }

    // 2. Método de integración con API externa de WhatsApp
    private async sendWhatsAppMessage(phone: string, message: string, notificationId: string) {
        try {
            // Ejemplo: Integración con Meta API / Twilio / Evolution API
            this.logger.log(`Enviando WhatsApp a ${phone}: ${message}`);

            // Actualizar estado a enviado
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: { status: NotificationStatus.SENT },
            });
        } catch (error) {
            this.logger.error(`Error enviando WhatsApp a ${phone}:`, error);
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: { status: NotificationStatus.FAILED },
            });
        }
    }

    // 3. Obtener notificaciones sin leer del usuario
    async getUserNotifications(userId: string) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }

    // 4. Marcar como leída
    async markAsRead(notificationId: string) {
        return this.prisma.notification.update({
            where: { id: notificationId },
            data: { status: NotificationStatus.READ },
        });
    }
}