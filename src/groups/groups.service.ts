import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta según tu proyecto
import { GetGroupsFilterDto } from './dto/get-groups-filter.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
    constructor(private readonly prisma: PrismaService) { }
    async create(createGroupDto: CreateGroupDto) {
        const { classroomId, instructorId, name, style, category, totalNumberOfSlots } = createGroupDto;

        // 1. Validaciones de existencia
        const classroomExists = await this.prisma.classroom.findUnique({ where: { id: classroomId } });
        if (!classroomExists) throw new NotFoundException(`El salón no existe.`);

        const instructorExists = await this.prisma.user.findUnique({ where: { id: instructorId } });
        if (!instructorExists) throw new NotFoundException(`El instructor no existe.`);

        if (totalNumberOfSlots > classroomExists.maxCapacity) {
            throw new BadRequestException(`Los cupos superan la capacidad máxima del salón.`);
        }

        // 2. Creación del grupo estructurando la relación correcta
        return await this.prisma.group.create({
            data: {
                name,
                style: style || null,
                category, // Ahora machea perfectamente al ser el enum de Prisma
                totalNumberOfSlots,

                // 🌟 CORRECCIÓN CRÍTICA: Inicializa la relación Uno a Muchos
                schedules: {
                    create: [
                        {
                            classroomId: classroomId, // Vincula el salón al horario actual
                            // El campo 'schedule' tomará el valor JSON por defecto configurado en tu schema.prisma
                        }
                    ]
                },

                // Conexiones de llaves foráneas a nivel estructural
                classroom: {
                    connect: { id: classroomId },
                },
                instructor: {
                    connect: { id: instructorId },
                },
            },
            include: {
                classroom: true,
                instructor: true,
                students: true,
                schedules: true, // Incluye la grilla en la respuesta de retorno si lo necesitas
            },
        });
    }
    // 🔍 READ ALL (Con paginación y filtro por nombre del salón o tipo)
    async findAll(filters: GetGroupsFilterDto) {
        const { page = 1, limit = 10, search, category } = filters;
        const skip = (page - 1) * limit;

        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {};

        if (category) {
            where.category = category;
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { style: { contains: search } },
            ];
        }

        // Ejecutar consultas en paralelo para optimizar rendimiento en BD
        const [totalItems, data] = await Promise.all([
            this.prisma.group.count({ where }),
            this.prisma.group.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                    classroom: true,
                    instructor: true,
                    students: true,
                    schedules: true,
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

    // 🔍 READ ONE
    async findOne(id: string) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            /* include: { groups: true } // Trae la información de los grupos asignados */
        });

        if (!group) {
            throw new NotFoundException(`El salón con ID "${id}" no existe.`);
        }

        return group;
    }

    // ✏️ UPDATE
    async update(id: string, updateGroupDto: UpdateGroupDto) {
        const { classroomId, instructorId, name, style, category, totalNumberOfSlots } = updateGroupDto;

        // 1. Validar que el grupo a actualizar exista
        const currentGroup = await this.prisma.group.findUnique({
            where: { id },
            include: { schedules: true }
        });
        if (!currentGroup) throw new NotFoundException(`El grupo con ID "${id}" no existe.`);

        // Determinar cuál salón se usará para validar las capacidades
        // (el nuevo si viene en el DTO, o el que ya tiene el grupo asignado)
        let targetClassroom: any = null;
        const finalClassroomId = classroomId || currentGroup.classroomId;

        if (finalClassroomId) {
            targetClassroom = await this.prisma.classroom.findUnique({
                where: { id: finalClassroomId }, include: {
                    groups: true
                }
            });
            if (!targetClassroom) throw new NotFoundException(`El salón especificado no existe.`);
        }

        // 2. Validaciones si se modifica el instructor
        if (instructorId) {
            const instructorExists = await this.prisma.user.findUnique({ where: { id: instructorId } });
            if (!instructorExists) throw new NotFoundException(`El instructor especificado no existe.`);
        }

        // 3. Validaciones de capacidades de cupos vs. el salón destino
        const finalSlots = totalNumberOfSlots !== undefined ? totalNumberOfSlots : currentGroup.totalNumberOfSlots;
        if (targetClassroom && finalSlots > targetClassroom.maxCapacity) {
            throw new BadRequestException(`Los cupos (${finalSlots}) superan la capacidad máxima del salón (${targetClassroom.maxCapacity}).`);
        }

        // 4. Actualización del Grupo
        return await this.prisma.group.update({
            where: { id },
            data: {
                // Valores directos (actualiza solo si se envían en el DTO)
                ...(name && { name }),
                ...(category && { category }),
                ...(totalNumberOfSlots !== undefined && { totalNumberOfSlots }),
                // Campos opcionales que pueden venir explícitamente nulos
                style: style !== undefined ? style : currentGroup.style,

                // Relación con Classroom
                ...(classroomId && {
                    classroom: {
                        connect: { id: classroomId }
                    },
                    // 🌟 CRÍTICO: Si el salón del grupo cambia, actualizamos el salón de sus horarios asociados
                    schedules: {
                        updateMany: {
                            where: { groupId: id },
                            data: { classroomId: classroomId }
                        }
                    }
                }),

                // Relación con Instructor
                ...(instructorId && {
                    instructor: {
                        connect: { id: instructorId }
                    }
                })
            },
            include: {
                classroom: true,
                instructor: true,
                students: true,
                schedules: true,
            }
        });
    }

    // ❌ DELETE
    async remove(id: string) {
        await this.findOne(id);

        await this.prisma.group.delete({
            where: { id },
        });

        return { message: `Grupo eliminado correctamente.` };
    }
}