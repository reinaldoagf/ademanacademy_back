import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { GetNotificationsFilterDto } from './dto/get-notifications-filter.dto';

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
        link?: string;
        channel?: NotificationChannel;
        metadata?: any;
    }) {
        const channel = dto.channel || NotificationChannel.Aplicación;

        // A. Registrar en base de datos
        const notification = await this.prisma.notification.create({
            data: {
                userId: dto.userId,
                recipientPhone: dto.recipientPhone,
                title: dto.title,
                message: dto.message,
                link: dto.link || null,
                channel,
                status: NotificationStatus.Pendiente,
                metadata: dto.metadata,
            },
        });

        // B. Enviar en tiempo real (In-App)
        if (channel === NotificationChannel.Aplicación || channel === NotificationChannel.Ambos) {
            if (dto.userId) {
                this.notificationsGateway.emitToUser(dto.userId, notification);
            } else {
                this.notificationsGateway.emitToAdmins(notification);
            }
        }

        // C. Enviar por WhatsApp
        if (channel === NotificationChannel.Whatsapp || channel === NotificationChannel.Ambos) {
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
                data: { status: NotificationStatus.Enviado },
            });
        } catch (error) {
            this.logger.error(`Error enviando WhatsApp a ${phone}:`, error);
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: { status: NotificationStatus.Fallido },
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

    // 4. Admin - Obtener notificaciones (para el dashboard)
    async findAll(userId: string, filters: GetNotificationsFilterDto) {
        const { page = 1, limit = 10, search, ownerFilter } = filters;
        const skip = (page - 1) * limit;
        const where: any = {};
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { message: { contains: search } },
            ];
        }

        if (ownerFilter && userId) {
            where.userId = userId;
        }
        const notifications = await this.prisma.notification.findMany({
            take: limit,
            where,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
                // Traemos el usuario para saber quién la recibió
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        ownedClients: { select: { firstName: true, lastName: true, email: true } },
                        representedClients: { select: { firstName: true, lastName: true, email: true } }
                    }
                }
            }
        });

        const totalItems = await this.prisma.notification.count();
        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: notifications,
            meta: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                itemCount: notifications.length,
            }
        };
    }
    async getRecentUnreadByUser(userId: string) {
        return await this.prisma.notification.findMany({
            where: {
                userId,
                status: NotificationStatus.Pendiente, // O el estado que consideres no leído
            },
            orderBy: { createdAt: 'desc' },
            take: 8,
        });
    }

    async markAsRead(notificationId: string, userId: string) {
        return await this.prisma.notification.update({
            where: { id: notificationId, userId },
            data: { status: NotificationStatus.Leido },
        });
    }

    async markAllAsRead(userId: string) {
        return await this.prisma.notification.updateMany({
            where: { userId, status: NotificationStatus.Pendiente },
            data: { status: NotificationStatus.Leido },
        });
    }
}