import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta según tu proyecto
import { GetGroupsFilterDto } from './dto/get-groups-filter.dto';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
    constructor(private readonly prisma: PrismaService) { }
    async create(createGroupDto: CreateGroupDto) {
        const { classroomId, instructorId, name, style, category, totalNumberOfSlots, usedSlots } = createGroupDto;

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
                usedSlots: usedSlots || 0,

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
                    classroom: true
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


    // ❌ DELETE
    async remove(id: string) {
        await this.findOne(id);

        await this.prisma.group.delete({
            where: { id },
        });

        return { message: `Grupo eliminado correctamente.` };
    }
}