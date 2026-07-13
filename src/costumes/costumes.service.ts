// /src/costumes/costumes.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCostumeDto } from './dto/create-costume.dto';
import { UpdateCostumeDto } from './dto/update-costume.dto';
import { GetCostumesFilterDto } from './dto/get-costumes-filter.dto';
import { AssignCostumeDto, UpdateAssignmentStatusDto } from './dto/assign-costume.dto';

@Injectable()
export class CostumesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createCostumeDto: CreateCostumeDto) {
        const existing = await this.prisma.costume.findUnique({
            where: { name: createCostumeDto.name },
        });
        if (existing) {
            throw new ConflictException(`El vestuario con nombre "${createCostumeDto.name}" ya existe.`);
        }

        const { availableSizes, ...data } = createCostumeDto;
        return this.prisma.costume.create({
            data: {
                ...data,
                availableSizes: availableSizes ? JSON.stringify(availableSizes) : '[]',
            },
        });
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
                    assignments: {
                        include: { student: true }
                    }
                }
            }),
        ]);

        // Rehidratar el JSON de tallas para el Front-end
        const parsedData = data.map(item => ({
            ...item,
            availableSizes: typeof item.availableSizes === 'string' ? JSON.parse(item.availableSizes) : item.availableSizes,
        }));

        return {
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
            },
            data: parsedData,
        };
    }

    async findOne(id: string) {
        const costume = await this.prisma.costume.findUnique({
            where: { id },
            include: {
                assignments: {
                    include: { student: true }
                }
            }
        });
        if (!costume) throw new NotFoundException('Vestuario no encontrado.');

        return {
            ...costume,
            availableSizes: typeof costume.availableSizes === 'string' ? JSON.parse(costume.availableSizes) : costume.availableSizes,
        };
    }

    async update(id: string, updateCostumeDto: UpdateCostumeDto) {
        await this.findOne(id);
        const { availableSizes, ...data } = updateCostumeDto;

        return this.prisma.costume.update({
            where: { id },
            data: {
                ...data,
                ...(availableSizes && { availableSizes: JSON.stringify(availableSizes) }),
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.costume.delete({ where: { id } });
    }

    // 🎯 ASIGNAR VESTUARIO A UN ALUMNO
    async assignToStudent(costumeId: string, assignDto: AssignCostumeDto) {
        // Validar existencia de entidades
        const costume = await this.prisma.costume.findUnique({ where: { id: costumeId } });
        if (!costume) throw new NotFoundException('Vestuario no encontrado.');

        const student = await this.prisma.student.findUnique({ where: { id: assignDto.studentId } });
        if (!student) throw new NotFoundException('Estudiante no encontrado.');

        // Crear asignación
        return this.prisma.studentCostume.create({
            data: {
                costumeId,
                studentId: assignDto.studentId,
                assignedSize: assignDto.assignedSize,
                observations: assignDto.observations,
                status: 'assigned',
            },
            include: { student: true, costume: true }
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
}