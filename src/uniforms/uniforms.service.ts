// /src/uniforms/uniforms.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { LockerRoomStatus } from '@prisma/client';
import { CreateUniformDto } from './dto/create-uniform.dto';
import { UpdateUniformDto } from './dto/update-uniform.dto';
import { GetUniformsFilterDto } from './dto/get-uniforms-filter.dto';
import { AssignUniformDto, UpdateAssignmentStatusDto } from './dto/assign-uniform.dto';
import { S3Service } from '../s3/s3.service';
interface SizeItem {
    size: string;
    quantity: number;
}
@Injectable()
export class UniformsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,) { }

    async create(createUniformDto: CreateUniformDto) {
        // 1. Asegúrate de que 'availableSizes' sea un objeto/array de JS real, NO un string
        let sizes = createUniformDto.availableSizes;
        if (typeof sizes === 'string') {
            try {
                sizes = JSON.parse(sizes);
            } catch (e) {
                sizes = []; // Fallback seguro
            }
        }
        const { images, ...data } = createUniformDto;
        // 3. Al guardar con Prisma, pásale los objetos de JS directamente
        try {
            return await this.prisma.uniform.create({
                data: {
                    name: createUniformDto.name,
                    category: createUniformDto.category,
                    status: createUniformDto.status,
                    images: images?.length
                        ? {
                            create: images.map((img, idx) => ({
                                url: img.url,
                                key: img.key,
                                altText: img.altText || createUniformDto.name,
                                type: idx === 0 ? 'cover' : 'gallery',
                                order: idx,
                            })),
                        }
                        : undefined,
                    price: createUniformDto.price ?? 0,
                    availableSizes: createUniformDto.availableSizes as unknown as Prisma.InputJsonValue,
                },
            });
        } catch (error) {

            // Manejo específico del error de duplicado de Prisma (P2002 = Unique constraint failed)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Ya existe un uniforme con el nombre "${createUniformDto.name}".`);
            }

            throw error;
        }
    }
    async findMyUniforms(userId: string, filters: GetUniformsFilterDto) {
        const { page = 1, limit = 10, search } = filters;
        const skip = (page - 1) * limit;
        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {};
        if (userId) {
            where.client = {
                userId: userId
            };
        }
        if (search) {
            where.OR = [
                {
                    user: {
                        OR: [
                            { name: { contains: search } },
                            { email: { contains: search } },
                            { dni: { contains: search } },
                        ],
                    },
                },
                {
                    client: {
                        OR: [
                            { firstName: { contains: search } },
                            { lastName: { contains: search } },
                            { dni: { contains: search } },
                        ],
                    },
                },
            ];
        }

        // Ejecutar consultas en paralelo para optimizar rendimiento en BD
        const [totalItems, data] = await Promise.all([
            this.prisma.studentUniform.count({ where }),
            this.prisma.studentUniform.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    student: true,
                    client: true,
                    uniform: true
                }
            }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);
        return {
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            },
            data,
        };
    }
    async findAll(filters: GetUniformsFilterDto) {
        const { page = 1, limit = 10, search, category, status } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (category) where.category = category;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search } },
            ];
        }

        const [totalItems, data] = await Promise.all([
            this.prisma.uniform.count({ where }),
            this.prisma.uniform.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    images: true,
                    uniformAssignments: {
                        include: { student: true }
                    }
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
            data: data.map(e => ({
                ...e,
                availableSizes: typeof e.availableSizes === 'string' ? JSON.parse(e.availableSizes) : e.availableSizes,
            }))
        };
    }

    async findOne(id: string) {
        const uniform = await this.prisma.uniform.findUnique({
            where: { id },
            include: {
                images: true,
                uniformAssignments: {
                    include: { student: true }
                },
            }
        });
        if (!uniform) throw new NotFoundException('Vestuario no encontrado.');
        return {
            ...uniform,
            availableSizes: typeof uniform.availableSizes === 'string' ? JSON.parse(uniform.availableSizes) : uniform.availableSizes,
        };
    }

    async update(id: string, updateUniformDto: UpdateUniformDto) {
        // 1. Obtener el registro actual
        const currentUniform = await this.findOne(id);
        if (!currentUniform) {
            throw new NotFoundException(`Vestuario con ID ${id} no encontrado`);
        }

        const { availableSizes, images, ...data } = updateUniformDto;

        // 🎯 Limpieza de imágenes eliminadas en S3 y BD
        if (images) {
            const newKeys = images.map((img) => img.key);
            const imagesToDelete = currentUniform.images.filter((img) => !newKeys.includes(img.key));

            // 1. Borrar de S3
            await Promise.all(imagesToDelete.map((img) => this.s3Service.deleteFile(img.key)));

            // 2. Limpiar registros anteriores de imágenes en BD para este evento
            await this.prisma.uniformImage.deleteMany({
                where: { uniformId: id },
            });
        }
        return this.prisma.uniform.update({
            where: { id },
            data: {
                ...data,
                ...(availableSizes && { availableSizes: JSON.stringify(availableSizes) }),
                images: images?.length
                    ? {
                        create: images.map((img, idx) => ({
                            url: img.url,
                            key: img.key,
                            altText: img.altText || updateUniformDto.name,
                            type: img.type || (idx === 0 ? 'cover' : 'gallery'),
                            order: img.order ?? idx,
                        })),
                    }
                    : undefined,
            },
        });
    }

    async remove(id: string) {
        // 1. Buscar el uniforme para obtener las rutas de sus imágenes
        const uniform = await this.findOne(id); // o this.uniformRepository.findOne({ where: { id } }) según tu ORM

        if (!uniform) {
            throw new NotFoundException(`El uniforme con ID "${id}" no existe.`);
        }


        // 3. Eliminar el registro de la base de datos
        const currentUniform = await this.prisma.uniform.delete({ where: { id }, include: { images: true } }); // Adapta según Mongoose / TypeORM / Prisma
        // 🎯 Limpieza de imágenes eliminadas en S3 y BD
        if (currentUniform.images.length) {
            // 1. Borrar de S3
            await Promise.all(currentUniform.images.map((img) => this.s3Service.deleteFile(img.key)));

            // 2. Limpiar registros anteriores de imágenes en BD para este evento
            await this.prisma.uniformImage.deleteMany({
                where: { uniformId: id },
            });
        }
        return {
            message: 'Vestuario e imágenes asociadas eliminados correctamente.',
            id,
        };
    }
    // 🎯 ASIGNAR VESTUARIO A UN ALUMNO
    async assignToStudent(assignDto: AssignUniformDto) {
        const { uniformId, assignments } = assignDto;

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
            const uniform = await tx.uniform.findUnique({
                where: { id: uniformId },
            });

            if (!uniform) {
                throw new NotFoundException('Vestuario no encontrado.');
            }

            // Parsear 'availableSizes'
            let sizes: SizeItem[] = [];
            if (typeof uniform.availableSizes === 'string') {
                try {
                    sizes = JSON.parse(uniform.availableSizes);
                } catch (e) {
                    sizes = [];
                }
            } else if (Array.isArray(uniform.availableSizes)) {
                sizes = uniform.availableSizes as unknown as SizeItem[];
            }

            // Contar demanda solicitada por cada talla
            const requiredQuantities: Record<string, number> = {};
            for (const item of assignments) {
                const sizeKey = item.assignedSize.toUpperCase();
                requiredQuantities[sizeKey] = (requiredQuantities[sizeKey] || 0) + 1;
            }

            // Validar stock disponible contra la demanda total requerida
            for (const [sizeKey, reqQty] of Object.entries(requiredQuantities)) {
                const sizeObj = sizes.find((s) => s.size.toUpperCase() === sizeKey);
                if (!sizeObj) {
                    throw new BadRequestException(
                        `La talla "${sizeKey}" no está configurada para este uniforme.`
                    );
                }
                if (sizeObj.quantity < reqQty) {
                    throw new BadRequestException(
                        `Stock insuficiente para la talla "${sizeKey}". Requeridos: ${reqQty}, Disponibles: ${sizeObj.quantity}.`
                    );
                }
            }

            // Descontar inventario
            for (const [sizeKey, reqQty] of Object.entries(requiredQuantities)) {
                const sizeObj = sizes.find((s) => s.size.toUpperCase() === sizeKey);
                if (sizeObj) {
                    sizeObj.quantity -= reqQty;
                }
            }

            // Actualizar el uniforme con el nuevo inventario de tallas
            await tx.uniform.update({
                where: { id: uniformId },
                data: {
                    availableSizes: sizes as any,
                },
            });

            // Crear los registros de asignación masiva
            const createdAssignments = await Promise.all(
                assignments.map((item) => {
                    const student = studentMap.get(item.studentId);
                    return tx.studentUniform.create({
                        data: {
                            uniformId,
                            studentId: item.studentId,
                            assignedSize: item.assignedSize,
                            observations: item.observations || null,
                            clientId: student?.clients?.[0]?.id || null,
                            status: 'assigned',
                            assignedAt: new Date(),
                        },
                        include: {
                            student: true,
                            uniform: true,
                        },
                    });
                })
            );

            return createdAssignments;
        });
    }
    // 🎯 ACTUALIZAR ESTADO DE LA ASIGNACIÓN (DEVOLVER/DAÑADO/EXTRAVIADO)
    async updateAssignmentStatus(assignmentId: string, dto: UpdateAssignmentStatusDto) {
        const assignment = await this.prisma.studentUniform.findUnique({ where: { id: assignmentId } });
        if (!assignment) throw new NotFoundException('Registro de asignación no encontrado.');

        return this.prisma.studentUniform.update({
            where: { id: assignmentId },
            data: {
                status: dto.status,
                observations: dto.observations,
                ...(dto.status !== 'assigned' && { returnedAt: new Date() }),
            },
        });
    }

    /**
   * Obtiene la cantidad de uniformes agrupados por estado.
   * Retorna una estructura con el total general y el detalle por cada status.
   */
    async getCountByStatus() {
        // 1. Agrupamiento directamente desde la base de datos con Prisma
        const countsByStatus = await this.prisma.uniform.groupBy({
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