import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta según tu proyecto
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

@Injectable()
export class ClassroomsService {
    constructor(private readonly prisma: PrismaService) { }

    // ➕ CREATE
    async create(createClassroomDto: CreateClassroomDto) {
        try {
            return await this.prisma.classroom.create({
                data: createClassroomDto,
            });
        } catch (error: any) {
            // Error P2002 es la restricción única de Prisma (Unique constraint)
            if (error.code === 'P2002') {
                throw new ConflictException('Ya existe un salón con ese nombre registrado.');
            }
            throw error;
        }
    }

    // 🔍 READ ALL (Con paginación y filtro por nombre del salón o tipo)
    async findAll(page: number = 1, limit: number = 10, search?: string) {
        const skip = (page - 1) * limit;

        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Ejecutar consultas en paralelo para optimizar rendimiento en BD
        const [totalItems, data] = await Promise.all([
            this.prisma.classroom.count({ where }),
            this.prisma.classroom.findMany({
                where,
                skip,
                take: limit,
                /* include: {
                    _count: {
                        select: { groups: true } // Cuenta cuántos grupos usan este salón
                    }
                }, */
                orderBy: { name: 'asc' },
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
            return await this.prisma.classroom.update({
                where: { id },
                data: updateClassroomDto,
            });
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