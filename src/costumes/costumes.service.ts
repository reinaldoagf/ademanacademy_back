// /src/costumes/costumes.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { S3Service } from '../s3/s3.service';
import { LockerRoomStatus } from '@prisma/client';
import { CreateCostumeDto } from './dto/create-costume.dto';
import { UpdateCostumeDto } from './dto/update-costume.dto';
import { GetCostumesFilterDto } from './dto/get-costumes-filter.dto';
import { AssignCostumeDto, UpdateAssignmentStatusDto } from './dto/assign-costume.dto';

@Injectable()
export class CostumesService {
    constructor(private readonly prisma: PrismaService, private readonly s3Service: S3Service,) { }

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
                        include: { student: true }
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
    // 🎯 ASIGNAR VESTUARIO A UN ALUMNO
    async assignToStudent(assignDto: AssignCostumeDto) {
        const { costumeId, assignments } = assignDto;

        if (!assignments || assignments.length === 0) {
            throw new BadRequestException('Debes agregar al menos un estudiante para realizar la asignación.');
        }

        // 1. Validar existencia de todos los estudiantes
        const studentIds = assignments.map((a) => a.studentId);
        const students = await this.prisma.student.findMany({
            where: { id: { in: studentIds } },
            include: { clients: true },
        });

        if (students.length !== studentIds.length) {
            throw new NotFoundException('Uno o más estudiantes especificados no existen.');
        }

        const studentMap = new Map(students.map((s) => [s.id, s]));

        // 2. Ejecutar transacción para descuento de stock y creación de registros
        return await this.prisma.$transaction(async (tx) => {
            const costume = await tx.costume.findUnique({
                where: { id: costumeId },
            });

            if (!costume) {
                throw new NotFoundException('Vestuario no encontrado.');
            }

            // Crear los registros de asignación masiva
            const createdAssignments = await Promise.all(
                assignments.map((item) => {
                    const student = studentMap.get(item.studentId);
                    return tx.studentCostume.create({
                        data: {
                            costumeId,
                            studentId: item.studentId,
                            observations: item.observations || null,
                            clientId: student?.clients?.[0]?.id || null,
                            status: 'assigned',
                            assignedAt: new Date(),
                        },
                        include: {
                            student: true,
                            costume: true,
                        },
                    });
                })
            );

            return createdAssignments;
        });
    }

    // 🎯 ACTUALIZAR ESTADO DE LA ASIGNACIÓN (DEVOLVER/DAÑADO/EXTRAVIADO)
    async updateAssignmentStatus(assignmentId: string, dto: UpdateAssignmentStatusDto) {
        const assignment = await this.prisma.studentCostume.findUnique({ where: { id: assignmentId } });
        if (!assignment) throw new NotFoundException('Registro de asignación no encontrado.');

        return this.prisma.studentCostume.update({
            where: { id: assignmentId },
            data: {
                status: dto.status,
                observations: dto.observations,
                ...(dto.status !== 'assigned' && { returnedAt: new Date() }),
            },
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
}