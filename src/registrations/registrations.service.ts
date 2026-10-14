import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConceptType, PaymentOrderStatus, TransactionStatus, PaymentMethod, RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetRegistrationsFilterDto } from './dto/get-registrations-filter.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Injectable()
export class RegistrationsService {

    constructor(private readonly prisma: PrismaService) { }
    // 🔍 READ ALL (Con paginación y Filtro de búsqueda por Alumno)
    async findAll(filters: GetRegistrationsFilterDto) {
        const { page = 1, limit = 10, search } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            // Clausura de búsqueda condicional
            where.OR = {
                user: {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' as const } },
                        { email: { contains: search, mode: 'insensitive' as const } },
                        { dni: { contains: search, mode: 'insensitive' as const } },
                    ],
                },
                student: {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' as const } },
                        { lastName: { contains: search, mode: 'insensitive' as const } },
                        { dni: { contains: search, mode: 'insensitive' as const } },
                    ],
                },
                group: {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' as const } },
                    ],
                },
            };
        }

        const [registrations, totalItems] = await Promise.all([
            this.prisma.registration.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }, // Transacciones más recientes primero
                include: {
                    user: {
                        select: { firstName: true, lastName: true, email: true, dni: true, phone: true },
                    },
                    student: true,
                    client: true,
                    group: true,
                },
            }),
            this.prisma.registration.count({ where }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);


        // Adaptamos la respuesta para que encaje perfectamente con la UI genérica
        return {
            data: registrations,
            meta: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
            },
        };
    }
    async create(userId: string, dto: CreateRegistrationDto) {
        const { payment } = dto;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                ownedClients: true
            }
        });
        if (!user) {
            throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
        }
        const client = await this.prisma.client.findUnique({
            where: { id: payment?.clientId },
            include: { student: true }
        });
        if (!client) {
            throw new NotFoundException(`Cliente con ID ${payment?.clientId} no encontrado`);
        }
        if (!payment) {
            throw new BadRequestException('Los datos de pago son obligatorios para la inscripción.');
        }

        return await this.prisma.$transaction(async (tx) => {
            // 1. Crear la Orden de Pago (PaymentOrder) para la inscripción
            const paymentOrder = await tx.paymentOrder.create({
                data: {
                    clientId: client.id,
                    concept: ConceptType.Inscripción,
                    amount: payment.amount,
                    status: PaymentOrderStatus.Pendiente,
                    registeringUserId: user.id,
                },
            });

            // 2. Crear la Transacción asociada con la URL directa del comprobante en S3
            const transaction = await tx.transaction.create({
                data: {
                    registeringUserId: user.id,
                    clientId: client.id,
                    paymentOrderId: paymentOrder.id,
                    concept: ConceptType.Inscripción,
                    amount: payment.amount,
                    method: PaymentMethod.Transferencia,
                    status: TransactionStatus.Pendiente,
                    bankName: payment.bankName,
                    referenceNumber: payment.referenceNumber,
                    receiptPath: payment.receiptPath, // 👈 Se guarda el enlace de S3
                },
            });

            // 3. Crear el registro de inscripción (Registration) en estado Pendiente
            const registration = await tx.registration.create({
                data: {
                    status: RegistrationStatus.Pendiente,
                    userId: user.id,
                    studentId: client.student?.id,
                    clientId: client.id,
                },
            });

            return {
                paymentOrder,
                transaction,
                registration,
            };
        });
    }
}