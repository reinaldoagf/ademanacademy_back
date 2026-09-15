// /src/clients/clients.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { GetClientsFilterDto } from './dto/get-clients-filter.dto';

@Injectable()
export class ClientsService {
    constructor(private readonly prisma: PrismaService) { }

    // ➕ CREATE
    async create(createClientDto: CreateClientDto) {
        try {
            const {
                userId,
                studentId,
                groupId,
                birthDate,
                type,
                kinship,
                medicalObservations,
                shirtSize,
                hasExperience,
                ...restDto
            } = createClientDto;

            return await this.prisma.$transaction(async (tx) => {
                // 1. Validar si el userId ya está en uso por otro cliente
                if (userId) {
                    const existingClientWithUser = await tx.client.findFirst({
                        where: { userId },
                    });

                    if (existingClientWithUser) {
                        throw new BadRequestException(
                            'El usuario seleccionado ya pertenece a otro cliente.',
                        );
                    }
                }

                let createdStudentId: string | null = studentId ?? null;

                // 2. Si el tipo es 'student', crear el registro Student
                if (type === 'student' && !createdStudentId) {
                    const newStudent = await tx.student.create({
                        data: {
                            shirtSize: shirtSize ?? 'M',
                            kinship,
                            medicalObservations,
                            hasExperience,
                        },
                    });
                    createdStudentId = newStudent.id;
                }

                // 3. Inserción del cliente
                return await tx.client.create({
                    data: {
                        ...restDto,
                        type,
                        birthDate: new Date(birthDate),
                        studentId: createdStudentId,
                        ...(userId && { userId }),
                        ...(groupId && { groupId }),
                    },
                    include: {
                        student: true,
                        user: {
                            select: { id: true, name: true, email: true },
                        },
                        group: true,
                    },
                });
            });
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new ConflictException(
                    'Ya existe un cliente con ese correo o DNI registrado.',
                );
            }
            throw error;
        }
    }

    // 🔍 READ ALL (Con paginación y búsqueda por DNI, Nombre, Apellido, Teléfono o Dirección)
    async findAll(filters: GetClientsFilterDto) {
        const { page = 1, limit = 10, search, type, groupId, userId } = filters;
        const skip = (page - 1) * limit;

        const where: Prisma.ClientWhereInput = {};

        if (type) {
            where.type = type;
        }

        if (groupId) {
            where.groupId = groupId;
        }

        if (userId) {
            where.userId = userId;
        }

        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { dni: { contains: search } },
                { phone: { contains: search } },
                { address: { contains: search } },
            ];
        }

        const [totalItems, data] = await Promise.all([
            this.prisma.client.count({ where }),
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
                            phone: true,
                        },
                    },
                    group: true,
                },
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
        const client = await this.prisma.client.findUnique({
            where: { id },
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
                        phone: true,
                    },
                },
                group: true,
                registrations: true,
                paymentOrders: true,
            },
        });

        if (!client) {
            throw new NotFoundException(`El cliente con ID "${id}" no existe.`);
        }

        return client;
    }

    // ✏️ UPDATE
    async update(id: string, updateClientDto: UpdateClientDto) {
        try {
            const {
                userId,
                studentId,
                groupId,
                birthDate,
                type,
                kinship,
                medicalObservations,
                shirtSize,
                hasExperience,
                ...restDto
            } = updateClientDto;

            const currentClient = await this.prisma.client.findUnique({
                where: { id },
                select: { studentId: true },
            });

            if (!currentClient) {
                throw new NotFoundException(`Cliente con ID ${id} no encontrado.`);
            }

            return await this.prisma.$transaction(async (tx) => {
                // 1. Validar que el userId no esté ocupado por OTRO cliente distinto a este
                if (userId) {
                    const existingClientWithUser = await tx.client.findFirst({
                        where: {
                            userId,
                            id: { not: id },
                        },
                    });

                    if (existingClientWithUser) {
                        throw new BadRequestException(
                            'El usuario seleccionado ya pertenece a otro cliente.',
                        );
                    }
                }

                let finalStudentId: string | null = currentClient.studentId;

                if (type === 'student') {
                    if (currentClient.studentId) {
                        await tx.student.update({
                            where: { id: currentClient.studentId },
                            data: {
                                shirtSize: shirtSize ?? 'M',
                                kinship,
                                medicalObservations,
                                hasExperience,
                            },
                        });
                    } else {
                        const newStudent = await tx.student.create({
                            data: {
                                shirtSize: shirtSize ?? 'M',
                                kinship,
                                medicalObservations,
                                hasExperience,
                            },
                        });
                        finalStudentId = newStudent.id;
                    }
                } else if (type === 'representative' && currentClient.studentId) {
                    finalStudentId = null;
                }

                // 2. Actualización de cliente
                const updatedClient = await tx.client.update({
                    where: { id },
                    data: {
                        ...restDto,
                        type,
                        studentId: finalStudentId,
                        ...(birthDate && { birthDate: new Date(birthDate) }),
                        ...(userId !== undefined && { userId }),
                    },
                    include: {
                        user: {
                            select: { id: true, name: true, email: true },
                        },
                        student: true,
                    },
                });

                if (type === 'representative' && currentClient.studentId) {
                    await tx.student.delete({
                        where: { id: currentClient.studentId },
                    });
                }

                return updatedClient;
            });
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new ConflictException(
                    'El correo o DNI ingresado ya pertenece a otro registro.',
                );
            }
            throw error;
        }
    }

    // ❌ DELETE
    async remove(id: string) {
        await this.findOne(id);

        await this.prisma.client.delete({
            where: { id },
        });

        return { message: `Cliente eliminado correctamente.` };
    }
}