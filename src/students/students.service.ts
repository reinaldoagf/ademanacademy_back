import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { GetStudentsFilterDto } from './dto/get-students-filter.dto';
import { ClientType, Kinship, Prisma } from '@prisma/client';


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
        const {
            dni,
            firstName,
            lastName,
            birthDate,
            address,
            phone,
            shirtSize,
            kinship,
            medicalObservations,
            hasExperience,
            userId,
            groupId,
        } = createStudentDto;

        // 1. Validar DNI único para estudiantes si fue enviado
        if (dni) {
            const existingStudent = await this.prisma.client.findFirst({
                where: { dni, type: ClientType.student },
            });

            if (existingStudent) {
                throw new ConflictException(`El estudiante con DNI "${dni}" ya está registrado`);
            }
        }

        // 2. Transacción de Prisma para crear ambas entidades
        return await this.prisma.$transaction(async (tx) => {
            // Step A: Crear el registro en 'Student'
            const newStudent = await tx.student.create({
                data: {
                    shirtSize,
                    kinship,
                    medicalObservations,
                    hasExperience,
                    groupId: groupId || null,
                },
            });

            // Step B: Crear el registro en 'Client' vinculado al 'Student'
            const newClient = await tx.client.create({
                data: {
                    dni,
                    firstName,
                    lastName,
                    birthDate: new Date(birthDate),
                    address,
                    phone,
                    type: ClientType.student, // Define el tipo como estudiante
                    userId: userId || null,
                    studentId: newStudent.id, // Relación 1 a N / 1 a 1 con Student
                    groupId: groupId || null,
                },
                include: {
                    student: {
                        include: {
                            group: true,
                        },
                    },
                    user: true,
                    group: true,
                },
            });

            return newClient;
        });
    }


    /**
     * Obtiene estudiantes con soporte para paginación, filtros por parentesco y búsqueda global
     */
    async findAll(filters: GetStudentsFilterDto) {
        const { page = 1, limit = 10, search, kinship, userId } = filters;
        const skip = (page - 1) * limit;

        // 1. Condición base: Solo clientes de tipo "student"
        const where: Prisma.ClientWhereInput = {
            type: ClientType.student,
        };

        // 2. Filtro opcional por userId (Representante/Usuario)
        if (userId) {
            where.userId = userId;
        }

        // 3. Filtro por parentesco (reside en la relación con Student)
        if (kinship) {
            where.student = {
                kinship: kinship,
            };
        }

        // 4. Búsqueda por Nombre, Apellido o DNI
        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { dni: { contains: search } },
            ];
        }

        // 5. Consulta paginada con conteo total
        const [data, totalItems] = await Promise.all([
            this.prisma.client.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    student: {
                        include: {
                            group: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    group: true,
                },
            }),
            this.prisma.client.count({ where }),
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
            },
        };
    }

    /**
   * Obtiene únicamente los estudiantes que pertenecen al usuario autenticado (userId)
   * con soporte para paginación, filtros por parentesco y búsqueda global
   */
    async findByUserId(userId: string, filters: GetStudentsFilterDto) {
        const { page = 1, limit = 10, search, kinship } = filters;
        const skip = (page - 1) * limit;

        // 1. Filtro base obligatorio: Tipo estudiante y pertenecientes al userId especificado
        const targetUserId = filters.userId || userId;

        const where: Prisma.ClientWhereInput = {
            type: ClientType.student,
            userId: targetUserId,
        };

        // 2. Filtro por parentesco (reside en la relación 'student')
        if (kinship) {
            where.student = {
                kinship: kinship,
            };
        }

        // 3. Búsqueda por Nombre, Apellido o DNI
        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { dni: { contains: search } },
            ];
        }

        // 4. Consultas paralelas
        const [data, totalItems] = await Promise.all([
            this.prisma.client.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    student: {
                        include: {
                            group: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    group: true,
                },
            }),
            this.prisma.client.count({ where }),
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
            },
        };
    }

    /**
     * Busca un estudiante por su ID único.
     */
    async findOne(id: string): Promise<any> {
        const clientStudent = await this.prisma.client.findFirst({
            where: {
                id,
                type: ClientType.student,
            },
            include: {
                student: {
                    include: {
                        group: true,
                    },
                },
                user: true,
                group: true,
            },
        });

        if (!clientStudent) {
            throw new NotFoundException(`Estudiante con ID ${id} no encontrado`);
        }

        return clientStudent;
    }
    /**
     * Actualiza los datos de un estudiante resguardando la unicidad del DNI
     */
    async update(id: string, updateStudentDto: UpdateStudentDto): Promise<any> {
        // Verificar existencia del cliente-estudiante y obtener el studentId
        const currentClient = await this.findOne(id);

        // console.log({ updateStudentDto })

        const {
            dni,
            firstName,
            lastName,
            birthDate,
            address,
            phone,
            shirtSize,
            kinship,
            medicalObservations,
            hasExperience,
            userId,
            groupId,
        } = updateStudentDto;

        // Validar conflicto de DNI en otros clientes de tipo estudiante
        if (dni) {
            const existingDni = await this.prisma.client.findFirst({
                where: {
                    dni,
                    type: ClientType.student,
                    NOT: { id },
                },
            });

            if (existingDni) {
                throw new ConflictException(`El DNI ${dni} ya pertenece a otro estudiante`);
            }
        }

        return await this.prisma.$transaction(async (tx) => {
            // A. Actualizar datos en la tabla 'Student' si existe la relación
            if (currentClient.studentId) {
                await tx.student.update({
                    where: { id: currentClient.studentId },
                    data: {
                        ...(shirtSize && { shirtSize }),
                        ...(kinship && { kinship }),
                        ...(medicalObservations !== undefined && { medicalObservations }),
                        ...(hasExperience !== undefined && { hasExperience }),
                        ...(groupId !== undefined && { groupId: groupId || null }),
                    },
                });
            }

            // B. Actualizar datos en la tabla 'Client'
            return await tx.client.update({
                where: { id },
                data: {
                    ...(dni !== undefined && { dni }),
                    ...(firstName && { firstName }),
                    ...(lastName && { lastName }),
                    ...(birthDate && { birthDate: new Date(birthDate) }),
                    ...(address && { address }),
                    ...(phone !== undefined && { phone }),
                    ...(userId !== undefined && { userId: userId || null }),
                    ...(groupId !== undefined && { groupId: groupId || null }),
                },
                include: {
                    student: {
                        include: {
                            group: true,
                        },
                    },
                    user: true,
                    group: true,
                },
            });
        });
    }

    /**
     * Elimina un estudiante de la base de datos
     */
    async remove(id: string): Promise<{ message: string }> {
        const clientStudent = await this.findOne(id);

        await this.prisma.$transaction(async (tx) => {
            // A. Eliminar el registro en Client (su FK studentId será liberada)
            await tx.client.delete({
                where: { id },
            });

            // B. Eliminar el registro asociado en Student si existía
            if (clientStudent.studentId) {
                await tx.student.delete({
                    where: { id: clientStudent.studentId },
                });
            }
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