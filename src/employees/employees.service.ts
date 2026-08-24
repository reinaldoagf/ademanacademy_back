import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta a tu PrismaService
import { Prisma, PayrollStatus, TypeOfContract, TypeOfEmployee } from '@prisma/client';

// DTOs sugeridos para tipado
export interface GetEmployeesFilterDto {
    page?: number;
    limit?: number;
    search?: string;
    typeOfContract?: TypeOfContract;
    typeOfEmployee?: TypeOfEmployee;
    payrollStatus?: PayrollStatus;
    groupId?: string;
}

@Injectable()
export class EmployeesService {
    constructor(private readonly prisma: PrismaService) { }

    // 🎯 1. CREAR EMPLEADO
    async create(data: any) {
        try {
            // Normalizar la fecha de nacimiento si viene como string
            const birthDate = data.birthDate ? new Date(data.birthDate) : null;
            if (!birthDate || isNaN(birthDate.getTime())) {
                throw new BadRequestException('La fecha de nacimiento (birthDate) no es válida.');
            }

            return await this.prisma.employee.create({
                data: {
                    dni: data.dni,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    birthDate,
                    typeOfContract: data.typeOfContract,
                    typeOfEmployee: data.typeOfEmployee,
                    medicalObservations: data.medicalObservations,
                    address: data.address,
                    phone: data.phone,
                    hoursTaughtMonth: data.hoursTaughtMonth ?? 1,
                    hourlyRate: new Prisma.Decimal(data.hourlyRate ?? 0),
                    bonus: new Prisma.Decimal(data.bonus ?? 0),
                    payrollStatus: data.payrollStatus,
                    userId: data.userId || null,
                    // Si envías un arreglo de IDs de grupos, puedes conectarlos
                    ...(data.groupIds && Array.isArray(data.groupIds) && {
                        groups: {
                            connect: data.groupIds.map((id: string) => ({ id })),
                        },
                    }),
                },
                include: {
                    user: {
                        select: { id: true, email: true },
                    },
                    groups: true,
                },
            });
        } catch (error) {
            // Manejo específico del error de restricción única de Prisma (P2002)
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                const target = (error.meta?.target as string[]) || [];
                if (target.includes('dni')) {
                    throw new ConflictException(`Ya existe un empleado registrado con el DNI "${data.dni}".`);
                }
                if (target.includes('userId')) {
                    throw new ConflictException(`El usuario seleccionado ya está vinculado a otro empleado.`);
                }
                throw new ConflictException('Ya existe un registro con esos datos únicos.');
            }

            throw error;
        }
    }

    // 🎯 2. OBTENER TODOS CON FILTROS Y PAGINACIÓN
    async findAll(filters: GetEmployeesFilterDto) {
        const {
            page = 1,
            limit = 10,
            search,
            typeOfContract,
            typeOfEmployee,
            payrollStatus,
            groupId,
        } = filters;

        const skip = (page - 1) * limit;
        const where: Prisma.EmployeeWhereInput = {};

        if (typeOfContract) where.typeOfContract = typeOfContract;
        if (typeOfEmployee) where.typeOfEmployee = typeOfEmployee;
        if (payrollStatus) where.payrollStatus = payrollStatus;

        // Filtro si pertenece a un grupo específico
        if (groupId) {
            where.groups = {
                some: { id: groupId },
            };
        }

        // Búsqueda por Nombre, Apellido, DNI o Teléfono
        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { dni: { contains: search } },
                { phone: { contains: search } },
                { user: { name: { contains: search } } },
            ];
        }

        const [totalItems, data] = await Promise.all([
            this.prisma.employee.count({ where }),
            this.prisma.employee.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, email: true, name: true },
                    },
                    groups: true,
                },
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

    // 🎯 3. OBTENER UN EMPLEADO POR ID
    async findOne(id: string) {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, email: true },
                },
                groups: true,
            },
        });

        if (!employee) {
            throw new NotFoundException(`Empleado con ID "${id}" no encontrado.`);
        }

        return employee;
    }

    // 🎯 4. ACTUALIZAR EMPLEADO
    async update(id: string, updateData: any) {
        // 1. Verificar si el empleado existe
        await this.findOne(id);

        const { groupIds, birthDate, hourlyRate, bonus, ...data } = updateData;

        console.log({ updateData })
        try {
            return await this.prisma.employee.update({
                where: { id },
                data: {
                    ...data,
                    ...(birthDate && { birthDate: new Date(birthDate) }),
                    ...(hourlyRate !== undefined && { hourlyRate: new Prisma.Decimal(hourlyRate) }),
                    ...(bonus !== undefined && { bonus: new Prisma.Decimal(bonus) }),
                    // Actualización de relación de grupos en caso de enviarse
                    ...(groupIds && Array.isArray(groupIds) && {
                        groups: {
                            set: groupIds.map((groupId: string) => ({ id: groupId })),
                        },
                    }),
                },
                include: {
                    user: {
                        select: { id: true, email: true },
                    },
                    groups: true,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException('Conflicto con datos únicos (DNI o Usuario) ya asignados a otro registro.');
            }
            throw error;
        }
    }

    // 🎯 5. ELIMINAR EMPLEADO
    async remove(id: string) {
        await this.findOne(id); // Lanza NotFoundException si no existe

        await this.prisma.employee.delete({
            where: { id },
        });

        return {
            message: 'Empleado eliminado correctamente.',
            id,
        };
    }

    // 🎯 6. ASIGNAR EMPLEADO A UN GRUPO
    async assignToGroup(employeeId: string, groupId: string) {
        await this.findOne(employeeId);

        return this.prisma.employee.update({
            where: { id: employeeId },
            data: {
                groups: {
                    connect: { id: groupId },
                },
            },
            include: { groups: true },
        });
    }

    // 🎯 7. REMOVER EMPLEADO DE UN GRUPO
    async removeFromGroup(employeeId: string, groupId: string) {
        await this.findOne(employeeId);

        return this.prisma.employee.update({
            where: { id: employeeId },
            data: {
                groups: {
                    disconnect: { id: groupId },
                },
            },
            include: { groups: true },
        });
    }

    // 🎯 8. MÉTRICA/CONTEO POR ESTADO DE NÓMINA (PayrollStatus)
    async getCountByPayrollStatus() {
        const countsByStatus = await this.prisma.employee.groupBy({
            by: ['payrollStatus'],
            _count: {
                payrollStatus: true,
            },
        });

        // Mapeo inicial dinámico basado en el Enum de Prisma
        const statusMap = Object.values(PayrollStatus).reduce((acc, status) => {
            acc[status] = 0;
            return acc;
        }, {} as Record<PayrollStatus, number>);

        let total = 0;

        countsByStatus.forEach((group) => {
            const count = group._count.payrollStatus;
            statusMap[group.payrollStatus] = count;
            total += count;
        });

        return {
            total,
            byPayrollStatus: statusMap,
        };
    }
}