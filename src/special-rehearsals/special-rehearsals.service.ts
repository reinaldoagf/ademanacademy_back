// src/special-rehearsals/special-rehearsals.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, PayableStatus, NotificationChannel, ExpenseFrequency } from '@prisma/client';
import { CreateSpecialRehearsalDto } from './dto/create-special-rehearsal.dto';
import { UpdateSpecialRehearsalDto } from './dto/update-special-rehearsal.dto';
import { GetSpecialRehearsalFilterDto } from './dto/get-special-rehearsals-filter.dto';

@Injectable()
export class SpecialRehearsalsService {
    constructor(private prisma: PrismaService) { }

    private timeToMinutes(timeStr: string): number {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }

    private getDayNameFromDate(dateObj: Date): string {
        const daysMap = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        return daysMap[dateObj.getDay()];
    }

    private async validateCollisions(classroomId: string | undefined, dateStr: string, startTime: string, endTime: string, excludeId?: string) {
        const startMin = this.timeToMinutes(startTime);
        const endMin = this.timeToMinutes(endTime);

        if (startMin >= endMin) {
            throw new BadRequestException('La hora de fin debe ser posterior a la hora de inicio.');
        }

        // Si no se asignó un salón interno (es un evento externo), no hay colisiones de salones que validar
        if (!classroomId) return;

        const rehearsalDate = new Date(dateStr + 'T00:00:00');
        const dayName = this.getDayNameFromDate(rehearsalDate);

        // 1. Validar colisión contra el HORARIO REGULAR (WeeklySchedule) en ese salón
        const weeklySchedules = await this.prisma.weeklySchedule.findMany({
            where: { classroomId },
        });

        for (const ws of weeklySchedules) {
            const scheduleObj = ws.schedule as Record<string, any>;
            const blocksForDay = scheduleObj?.[dayName] || [];

            for (const block of blocksForDay) {
                const regStart = this.timeToMinutes(block.startTime);
                const regEnd = this.timeToMinutes(block.endTime);

                if (startMin < regEnd && endMin > regStart) {
                    throw new BadRequestException(
                        `El ensayo colisiona con una clase regular programada los días ${dayName} de ${block.startTime} a ${block.endTime} en este salón.`
                    );
                }
            }
        }

        // 2. Validar colisión contra OTROS ENSAYOS ESPECIALES en el mismo salón y fecha exacta
        const existingRehearsals = await this.prisma.specialRehearsal.findMany({
            where: {
                classroomId,
                date: rehearsalDate,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });

        for (const existing of existingRehearsals) {
            const exStart = this.timeToMinutes(existing.startTime);
            const exEnd = this.timeToMinutes(existing.endTime);

            if (startMin < exEnd && endMin > exStart) {
                throw new BadRequestException(
                    `El ensayo colisiona con otro ensayo especial ya registrado en este salón (${existing.startTime} - ${existing.endTime}).`
                );
            }
        }
    }

    // --- CRUD ---

    async create(dto: CreateSpecialRehearsalDto) {
        console.log({ dto });
        const { classroomId, date, startTime, endTime, studentIds, ...rest } = dto;

        // Si se envió un salón, verificar que exista
        if (classroomId) {
            const classroomExists = await this.prisma.classroom.findUnique({ where: { id: classroomId } });
            if (!classroomExists) throw new NotFoundException('El salón especificado no existe.');
        }

        // Validar colisiones (solo aplicará si classroomId está presente)
        await this.validateCollisions(classroomId, date, startTime, endTime);

        return await this.prisma.specialRehearsal.create({
            data: {
                ...rest,
                date: new Date(date + 'T00:00:00'),
                startTime,
                endTime,
                ...(classroomId ? { classroom: { connect: { id: classroomId } } } : { classroomId: null }),
                ...(studentIds && studentIds.length > 0 && {
                    students: {
                        connect: studentIds.map((id) => ({ id })),
                    },
                }),
            },
            include: {
                classroom: true,
                students: true,
            },
        });
    }

    async findAll(filters: GetSpecialRehearsalFilterDto) {
        const {
            page = 1,
            limit = 10,
            search,
        } = filters;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where: Prisma.SpecialRehearsalWhereInput = {};
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
            ];
        }
        const [totalItems, data] = await Promise.all([
            this.prisma.specialRehearsal.count({ where }),
            this.prisma.specialRehearsal.findMany({
                include: {
                    classroom: true,
                    students: true,
                },
                orderBy: { date: 'desc' },
                where,
                skip,
                take,
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

    async findOne(id: string) {
        const rehearsal = await this.prisma.specialRehearsal.findUnique({
            where: { id },
            include: {
                classroom: true,
                students: true,
            },
        });
        if (!rehearsal) throw new NotFoundException(`Ensayo especial con ID "${id}" no encontrado.`);
        return rehearsal;
    }

    async update(id: string, dto: UpdateSpecialRehearsalDto) {
        console.log({ dto });
        const current = await this.findOne(id);

        const targetClassroom = dto.classroomId !== undefined ? dto.classroomId : current.classroomId;
        const targetDate = dto.date || current.date.toISOString().split('T')[0];
        const targetStart = dto.startTime || current.startTime;
        const targetEnd = dto.endTime || current.endTime;

        // Validar colisiones con el salón de destino (si aplica)
        await this.validateCollisions(targetClassroom || undefined, targetDate, targetStart, targetEnd, id);

        return await this.prisma.specialRehearsal.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                ...(dto.date && { date: new Date(dto.date + 'T00:00:00') }),
                startTime: dto.startTime,
                endTime: dto.endTime,
                location: dto.location,
                // Manejo dinámico del salón (conectar o desconectar si pasa a ser externo)
                ...(dto.classroomId !== undefined && {
                    classroom: dto.classroomId ? { connect: { id: dto.classroomId } } : { disconnect: true },
                }),
                ...(dto.studentIds !== undefined && {
                    students: {
                        set: dto.studentIds.map((sid) => ({ id: sid })),
                    },
                }),
            },
            include: {
                classroom: true,
                students: true,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return await this.prisma.specialRehearsal.delete({
            where: { id },
        });
    }
}