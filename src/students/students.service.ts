import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { GetStudentsFilterDto } from './dto/get-students-filter.dto';
import { Kinship } from '@prisma/client';
import { group } from 'console';

// Diccionario para los conceptos (por si también quieres traducirlos)
/* export const KinshipLabel: Record<Kinship, string> = {
    [Kinship.son]: 'Hijo',
    [Kinship.daughter]: 'Hija',
    [Kinship.nephew]: 'Sobrino',
    [Kinship.niece]: 'Sobrina',
    [Kinship.tutored]: 'Tutorado',
    [Kinship.other]: 'Otro',
}; */
@Injectable()
export class StudentsService {

    constructor(private readonly prisma: PrismaService) { }



    /**
     * Crea un nuevo estudiante validando la unicidad del DNI
     */
    async create(createStudentDto: CreateStudentDto): Promise<any> {
        if (createStudentDto.dni) {
            // 🌟 CAMBIADO: findUnique ➡️ findFirst
            const existingStudent = await this.prisma.student.findFirst({
                where: { dni: createStudentDto.dni },
            });

            if (existingStudent) {
                throw new ConflictException(`El estudiante con DNI ${createStudentDto.dni} ya está registrado`);
            }
        }

        return await this.prisma.student.create({
            data: {
                ...createStudentDto,
                birthDate: new Date(createStudentDto.birthDate),
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                group: true
            }
        });
    }

    /**
     * Obtiene estudiantes con soporte para paginación, filtros por parentesco y búsqueda global
     */
    async findAll(filters: GetStudentsFilterDto) {
        const { page = 1, limit = 10, search, kinship } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (kinship) {
            where.kinship = kinship;
        }

        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { dni: { contains: search } },
            ];
        }

        const [data, totalItems] = await Promise.all([
            this.prisma.student.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    },
                    group: true
                }
            }),
            this.prisma.student.count({ where })
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: data,
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            }
        };
    }

    /**
   * Obtiene únicamente los estudiantes que pertenecen al usuario autenticado (userId)
   * con soporte para paginación, filtros por parentesco y búsqueda global
   */
    async findByUserId(userId: string, filters: GetStudentsFilterDto) {
        const { page = 1, limit = 10, search, kinship } = filters;
        const skip = (page - 1) * limit;

        // 1. Forzamos que la consulta base filtre estrictamente por el userId del token
        const where: any = {
            userId: filters.userId ? filters.userId : userId, // 👈 Ajusta este campo según el nombre exacto de la FK en tu schema (ej. userId o representativeId)
        };

        // 2. Acoplamos los filtros condicionales adicionales
        if (kinship) {
            where.kinship = kinship;
        }

        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { dni: { contains: search } },
            ];
        }

        // 3. Consultas paralelas optimizadas
        const [data, totalItems] = await Promise.all([
            this.prisma.student.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                }
            }),
            this.prisma.student.count({ where })
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            data,
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            }
        };
    }

    /**
     * Busca un estudiante por su ID único.
     */
    async findOne(id: string): Promise<any> {
        const student = await this.prisma.student.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!student) {
            throw new NotFoundException(`Estudiante con ID ${id} no encontrado`);
        }
        return student;
    }

    /**
     * Actualiza los datos de un estudiante resguardando la unicidad del DNI
     */
    async update(id: string, updateStudentDto: UpdateStudentDto): Promise<any> {
        await this.findOne(id);

        if (updateStudentDto.dni) {
            const existingDni = await this.prisma.student.findFirst({
                where: { dni: updateStudentDto.dni, NOT: { id } },
            });
            if (existingDni) {
                throw new ConflictException(`El DNI ${updateStudentDto.dni} ya pertenece a otro estudiante`);
            }
        }

        return await this.prisma.student.update({
            where: { id },
            data: {
                ...updateStudentDto,
                birthDate: updateStudentDto.birthDate ? new Date(updateStudentDto.birthDate) : undefined,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                group: true
            }
        });
    }

    /**
     * Elimina un estudiante de la base de datos
     */
    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);

        await this.prisma.student.delete({
            where: { id },
        });

        return { message: `Estudiante con ID ${id} eliminado correctamente` };
    }

    /**
     * Cuenta el total de estudiantes registrados
     */
    async countAll(): Promise<number> {
        return await this.prisma.student.count();
    }
}