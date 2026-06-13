import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ClassroomType, ClassroomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta según tu proyecto
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { GetClassroomsFilterDto } from './dto/get-classrooms-filter.dto'

// Diccionario para los conceptos (por si también quieres traducirlos)
export const ClassroomTypeLabel: Record<ClassroomType, string> = {
    [ClassroomType.mirrors]: 'Espejos',
    [ClassroomType.urban]: 'Urbano',
    [ClassroomType.free]: 'Libre',
    [ClassroomType.theories]: 'Teorias',
};

export const ClassroomStatusLabel: Record<ClassroomStatus, string> = {
    [ClassroomStatus.active]: 'Activo',
    [ClassroomStatus.maintenance]: 'Mantenimiento'
};

@Injectable()
export class ClassroomsService {
    constructor(private readonly prisma: PrismaService) { }

    // ➕ CREATE
    async create(createClassroomDto: CreateClassroomDto) {
        try {
            const data = await this.prisma.classroom.create({
                data: createClassroomDto,
            })

            return {
                ...data,
                type: ClassroomTypeLabel[data.type],
                status: ClassroomStatusLabel[data.status]
            };
        } catch (error: any) {
            // Error P2002 es la restricción única de Prisma (Unique constraint)
            if (error.code === 'P2002') {
                throw new ConflictException('Ya existe un salón con ese nombre registrado.');
            }
            throw error;
        }
    }

    // 🔍 READ ALL (Con paginación y filtro por nombre del salón o tipo)
    async findAll(filters: GetClassroomsFilterDto) {
        const { page = 1, limit = 10, search, status, type } = filters;
        const skip = (page - 1) * limit;

        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {};
        if (status) {
            where.status = status;
        }
        if (type) {
            where.type = type;
        }
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { address: { contains: search } },
                { description: { contains: search } },
            ];
        }

        // Ejecutar consultas en paralelo para optimizar rendimiento en BD
        const [totalItems, data] = await Promise.all([
            this.prisma.classroom.count({ where }),
            this.prisma.classroom.findMany({
                where,
                skip,
                take: limit,
                include: {
                    groups: {
                        include: {
                            schedules: {
                                include: {
                                    group: true,
                                },
                            },
                        },
                    },
                    schedules: {
                        include: {
                            group: true,
                        },
                    }
                },
                orderBy: { name: 'asc' },
                /* include: {
                    _count: {
                        select: { groups: true } // Cuenta cuántos grupos usan este salón
                    }
                }, */
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
            data: data.map(e => ({ ...e, type: ClassroomTypeLabel[e.type], status: ClassroomStatusLabel[e.status] })),
        };
    }

    // 🔍 READ ONE
    async findOne(id: string) {
        const classroom = await this.prisma.classroom.findUnique({
            where: { id },
            /* include: { groups: true } // Trae la información de los grupos asignados */
        });

        if (!classroom) {
            throw new NotFoundException(`El salón con ID "${id}" no existe.`);
        }

        return classroom;
    }

    // ✏️ UPDATE
    async update(id: string, updateClassroomDto: UpdateClassroomDto) {
        // Verificar existencia previa
        await this.findOne(id);

        try {
            const data = await this.prisma.classroom.update({
                where: { id },
                data: updateClassroomDto,
            })
            return {
                ...data,
                type: ClassroomTypeLabel[data.type],
                status: ClassroomStatusLabel[data.status]
            };
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new ConflictException('El nombre ingresado ya está siendo usado por otro salón.');
            }
            throw error;
        }
    }

    // ❌ DELETE
    async remove(id: string) {
        await this.findOne(id);

        await this.prisma.classroom.delete({
            where: { id },
        });

        return { message: `Salón eliminado de la infraestructura correctamente.` };
    }
}