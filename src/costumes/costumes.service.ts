// /src/costumes/costumes.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AssignmentStatus, ConceptType, PaymentOrderStatus, NotificationChannel } from '@prisma/client';
import { S3Service } from '../s3/s3.service';
import { LockerRoomStatus } from '@prisma/client';
import { CreateCostumeDto } from './dto/create-costume.dto';
import { UpdateCostumeDto } from './dto/update-costume.dto';
import { GetCostumesFilterDto } from './dto/get-costumes-filter.dto';
import { AssignCostumeDto, UpdateAssignmentStatusDto } from './dto/assign-costume.dto';
import { NotificationsService } from '@/notifications/notifications.service';

@Injectable()
export class CostumesService {
    private readonly logger = new Logger(CostumesService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,
        private notificationsService: NotificationsService
    ) { }

    async create(createCostumeDto: CreateCostumeDto) {
        const { images, ...data } = createCostumeDto;
        // 3. Al guardar con Prisma, pásale los objetos de JS directamente
        try {
            // availableSizes: sizes,
            return await this.prisma.costume.create({
                data: {
                    name: createCostumeDto.name,
                    beat: createCostumeDto.beat,
                    category: createCostumeDto.category,
                    status: createCostumeDto.status,
                    images: images?.length
                        ? {
                            create: images.map((img, idx) => ({
                                url: img.url,
                                key: img.key,
                                altText: img.altText || createCostumeDto.name,
                                type: idx === 0 ? 'cover' : 'gallery',
                                order: idx,
                            })),
                        }
                        : undefined,
                    price: createCostumeDto.price ?? 0,
                },
            });
        } catch (error) {

            // Manejo específico del error de duplicado de Prisma (P2002 = Unique constraint failed)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Ya existe un vestuario con el nombre "${createCostumeDto.name}".`);
            }

            throw error;
        }
    }
    async findAll(filters: GetCostumesFilterDto) {
        const { page = 1, limit = 10, search, category, status } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (category) where.category = category;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { beat: { contains: search } },
            ];
        }

        const [totalItems, data] = await Promise.all([
            this.prisma.costume.count({ where }),
            this.prisma.costume.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    costumeAssignments: {
                        include: { student: true, client: true }
                    },
                    images: true,
                }
            }),
        ]);

        return {
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
            },
            data,
        };
    }

    async findOne(id: string) {
        const costume = await this.prisma.costume.findUnique({
            where: { id },
            include: {
                images: true,
                costumeAssignments: {
                    include: { student: true }
                }
            }
        });
        if (!costume) throw new NotFoundException('Vestuario no encontrado.');
        return costume;
    }

    async update(id: string, updateCostumeDto: UpdateCostumeDto) {
        // 1. Obtener el registro actual
        const currentCostume = await this.findOne(id);
        if (!currentCostume) {
            throw new NotFoundException(`Vestuario con ID ${id} no encontrado`);
        }

        const { images, ...data } = updateCostumeDto;

        // 🎯 Limpieza de imágenes eliminadas en S3 y BD
        if (images) {
            const newKeys = images.map((img) => img.key);
            const imagesToDelete = currentCostume.images.filter((img) => !newKeys.includes(img.key));

            // 1. Borrar de S3
            await Promise.all(imagesToDelete.map((img) => this.s3Service.deleteFile(img.key)));

            // 2. Limpiar registros anteriores de imágenes en BD para este evento
            await this.prisma.costumeImage.deleteMany({
                where: { costumeId: id },
            });
        }
        // 6. Actualizar en la base de datos
        // ...(availableSizes && { availableSizes: JSON.stringify(availableSizes) }),
        return this.prisma.costume.update({
            where: { id },
            data: {
                ...data,
                images: images?.length
                    ? {
                        create: images.map((img, idx) => ({
                            url: img.url,
                            key: img.key,
                            altText: img.altText || updateCostumeDto.name,
                            type: img.type || (idx === 0 ? 'cover' : 'gallery'),
                            order: img.order ?? idx,
                        })),
                    }
                    : undefined,
            },
        });
    }

    async remove(id: string) {
        // 1. Buscar el vestuario para obtener las rutas de sus imágenes
        const costume = await this.findOne(id); // o this.costumeRepository.findOne({ where: { id } }) según tu ORM

        if (!costume) {
            throw new NotFoundException(`El vestuario con ID "${id}" no existe.`);
        }

        // 3. Eliminar el registro de la base de datos
        const currentCostume = await this.prisma.costume.delete({ where: { id }, include: { images: true } }); // Adapta según Mongoose / TypeORM / Prisma
        // 🎯 Limpieza de imágenes eliminadas en S3 y BD
        if (currentCostume.images.length) {
            // 1. Borrar de S3
            await Promise.all(currentCostume.images.map((img) => this.s3Service.deleteFile(img.key)));

            // 2. Limpiar registros anteriores de imágenes en BD para este evento
            await this.prisma.costumeImage.deleteMany({
                where: { costumeId: id },
            });
        }
        return {
            message: 'Vestuario e imágenes asociadas eliminados correctamente.',
            id,
        };
    }
    // 🌟 ASIGNAR VESTUARIO Y GENERAR 50% DE ADELANTO
    async assignToStudent(dto: AssignCostumeDto) {
        const { costumeId, assignments } = dto;
        if (!assignments || assignments.length === 0) {
            throw new BadRequestException('Debes agregar al menos un estudiante para realizar la asignación.');
        }

        const studentIds = assignments.map((a: any) => a.studentId);
        const students = await this.prisma.student.findMany({
            where: { id: { in: studentIds } },
            include: { clients: { include: { representative: true } }, },
        });

        if (students.length !== studentIds.length) {
            throw new NotFoundException('Uno o más estudiantes especificados no existen.');
        }

        const studentMap = new Map(students.map((s) => [s.id, s]));

        return await this.prisma.$transaction(async (tx) => {
            const costume = await tx.costume.findUnique({
                where: { id: costumeId },
            });

            if (!costume) {
                throw new NotFoundException('Vestuario no encontrado.');
            }

            const unitPrice = Number(costume.price);
            const downPayment = unitPrice * 0.5; // 50% de adelanto

            const createdAssignments: any[] = [];

            for (const item of assignments) {
                const student = studentMap.get(item.studentId);
                const clientId = student?.clients?.[0]?.id || null;
                const userId = student?.clients?.[0]?.representative?.id || student?.clients?.[0]?.userId || null;

                // 1. Crear la asignación del vestuario
                const studentCostume = await tx.studentCostume.create({
                    data: {
                        costumeId,
                        studentId: item.studentId,
                        assignedSize: item.assignedSize || null,
                        observations: item.observations || null,
                        clientId,
                        status: AssignmentStatus.Asignado,
                        assignedAt: new Date(),
                        returnDate: item.returnDate ? new Date(item.returnDate) : null,
                    },
                    include: { student: true, costume: true },
                });

                // 2. Emitir la Orden de Pago del 50% de Adelanto (Consideración 2)
                if (clientId) {
                    const order = await tx.paymentOrder.create({
                        data: {
                            clientId,
                            amount: downPayment,
                            concept: ConceptType.Vestuario, //concept: `Adelanto 50% - Vestuario: ${costume.name} (Talla: ${item.assignedSize || 'N/A'})`,
                            status: PaymentOrderStatus.Pendiente,
                            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días para pagar el adelanto
                        },
                    });

                    // Notificar al usuario sobre la orden de pago del adelanto
                    if (userId) {
                        await this.notificationsService.sendNotification({
                            userId,
                            title: 'Orden de Pago Generada (Adelanto Vestuario)',
                            message: `Se ha generado la orden de pago del 50% ($${downPayment.toFixed(2)}) para el vestuario "${costume.name}".`,
                            channel: NotificationChannel.Aplicación,
                            link: `/client/payment-orders/${order.id}`
                        });
                    }
                }

                createdAssignments.push(studentCostume);
            }

            return createdAssignments;
        });
    }

    // 🌟 ACTUALIZAR ESTADO (Y EMITIR SEGUNDO PAGO 50% SI ESTÁ LISTO PARA ENTREGAR)
    async updateAssignmentStatus(assignmentId: string, dto: UpdateAssignmentStatusDto) {
        return await this.prisma.$transaction(async (tx) => {
            const assignment = await tx.studentCostume.findUnique({
                where: { id: assignmentId },
                include: { costume: true, client: true },
            });

            if (!assignment) throw new NotFoundException('Registro de asignación no encontrado.');

            const previousStatus = assignment.status;
            const updated = await tx.studentCostume.update({
                where: { id: assignmentId },
                data: {
                    status: dto.status,
                    observations: dto.observations,
                    ...(dto.status !== AssignmentStatus.Asignado && { returnedAt: new Date() }),
                },
                include: { client: { include: { representative: true, user: true } }, costume: true },
            });

            // Consideración 2: Si el estado cambia a 'ListoParaEntregar' (o el equivalente en tu enum), emitir el 50% restante
            // Nota: Ajusta 'Listo_Para_Entregar' al valor exacto de tu enum AssignmentStatus
            if (dto.status === AssignmentStatus.Listo_Para_Entregar && previousStatus !== AssignmentStatus.Listo_Para_Entregar && updated.clientId) {
                const unitPrice = Number(updated.costume.price);
                const remainingPayment = unitPrice * 0.5;

                const order = await tx.paymentOrder.create({
                    data: {
                        clientId: updated.clientId,
                        amount: remainingPayment,
                        concept: ConceptType.Vestuario, // concept: `Saldo Restante 50% - Vestuario: ${updated.costume.name} (Listo para entrega)`,
                        status: PaymentOrderStatus.Pendiente,
                        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                    },
                });

                if (updated.client?.representative?.id || updated.client?.user?.id) {
                    await this.notificationsService.sendNotification({
                        userId: updated.client.representative?.id || updated.client.user?.id,
                        title: 'Segundo Pago de Vestuario - Listo para Entregar',
                        message: `Tu vestuario "${updated.costume.name}" está listo para entrega. Se ha generado la orden por el 50% restante ($${remainingPayment.toFixed(2)}).`,
                        channel: NotificationChannel.Aplicación,
                        link: `/client/payment-orders/${order.id}`
                    });
                }
            }

            return updated;
        });
    }

    /**
   * Obtiene la cantidad de vestuarios agrupados por estado.
   * Retorna una estructura con el total general y el detalle por cada status.
   */
    async getCountByStatus() {
        // 1. Agrupamiento directamente desde la base de datos con Prisma
        const countsByStatus = await this.prisma.costume.groupBy({
            by: ['status'],
            _count: {
                status: true,
            },
        });

        // 2. Mapeamos la respuesta inicial en un objeto base con valores en 0
        const statusMap = Object.values(LockerRoomStatus).reduce((acc, status) => {
            acc[status] = 0;
            return acc;
        }, {} as Record<LockerRoomStatus, number>);

        let total = 0;

        // 3. Rellenamos con los conteos reales obtenidos
        countsByStatus.forEach((group) => {
            const count = group._count.status;
            statusMap[group.status] = count;
            total += count;
        });

        return {
            total,
            byStatus: statusMap,
        };
    }

    // 🌟 TAREA PROGRAMADA (CRON): NOTIFICACIONES DE DEVOLUCIÓN A LAS 72 Y 24 HORAS (Consideración 4)
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async notifyPendingReturns() {
        this.logger.log('Verificando fechas de devolución de vestuarios pendientes...');

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Definimos las fechas objetivo: exactamete en 3 días (72h) y en 1 día (24h)
        const date72h = new Date(now);
        date72h.setDate(date72h.getDate() + 3);

        const date24h = new Date(now);
        date24h.setDate(date24h.getDate() + 1);

        const assignmentsToNotify = await this.prisma.studentCostume.findMany({
            where: {
                returnedAt: null,
                returnDate: {
                    in: [date72h, date24h],
                },
            },
            include: {
                costume: true,
                client: {
                    include: {
                        representative: true,
                        user: true,
                    },
                },
            },
        });

        for (const item of assignmentsToNotify) {
            if ((!item.client?.user?.id && !item.client?.representative?.id) || !item.returnDate) continue;

            const is72h = item.returnDate.getTime() === date72h.getTime();
            const hoursText = is72h ? '72 horas (3 días)' : '24 horas (mañana)';

            await this.notificationsService.sendNotification({
                userId: item.client.representative?.id || item.client.user?.id,
                title: `Recordatorio: Devolución de Vestuario en ${hoursText} ⏳`,
                message: `Te recordamos que el vestuario "${item.costume.name}" asignado debe ser devuelto el ${item.returnDate.toLocaleDateString('es-ES')}.`,
                channel: NotificationChannel.Aplicación,
            });

            this.logger.log(`[NOTIFICACIÓN DEVOLUCIÓN] Enviada a usuario ${item.client.userId} para el vestuario "${item.costume.name}"`);
        }
    }
}