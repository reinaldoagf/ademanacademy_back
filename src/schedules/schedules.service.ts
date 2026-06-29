import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SchedulesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createScheduleDto: CreateScheduleDto) {
        const { groupId, classroomId, day, newBlock } = createScheduleDto;

        // 1. Validaciones de existencia
        const classroomExists = await this.prisma.classroom.findUnique({ where: { id: classroomId } });
        if (!classroomExists) throw new NotFoundException(`El salón no existe.`);

        const groupExists = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!groupExists) throw new NotFoundException(`El grupo no existe.`);

        // Estructura base por defecto por si es la primera vez que se crea
        const defaultSchedule: Record<string, any[]> = {
            lunes: [], martes: [], miércoles: [], jueves: [], viernes: [], sábado: [], domingo: []
        };

        // 2. Buscar si ya existe un horario asignado a este grupo en este salón
        const existingSchedule = await this.prisma.weeklySchedule.findFirst({
            where: { groupId, classroomId }
        });

        let updatedScheduleObject: Record<string, any[]>;

        if (existingSchedule) {
            // Si ya existe, parseamos el JSON guardado de manera segura
            updatedScheduleObject = typeof existingSchedule.schedule === 'string'
                ? JSON.parse(existingSchedule.schedule)
                : (existingSchedule.schedule as Record<string, any[]>);

            // Validamos que el formato del día sea correcto dentro del JSON
            if (!updatedScheduleObject[day]) {
                updatedScheduleObject[day] = [];
            }

            // Opcional: Evitar duplicados de ID de bloque
            const blockIndex = updatedScheduleObject[day].findIndex(b => b.id === newBlock.id);
            if (blockIndex > -1) {
                // Si el ID del bloque ya existe, lo actualizamos
                updatedScheduleObject[day][blockIndex] = newBlock;
            } else {
                // Si es nuevo, lo añadimos
                updatedScheduleObject[day].push(newBlock);
            }

            // Actualizamos el registro existente
            return await this.prisma.weeklySchedule.update({
                where: { id: existingSchedule.id },
                data: {
                    schedule: updatedScheduleObject as Prisma.InputJsonValue
                }
            });

        } else {
            // Si es la primera vez, añadimos el bloque directamente a la estructura base
            updatedScheduleObject = { ...defaultSchedule };
            updatedScheduleObject[day].push(newBlock);

            // Creamos el registro por primera vez
            return await this.prisma.weeklySchedule.create({
                data: {
                    groupId,
                    classroomId,
                    schedule: updatedScheduleObject as Prisma.InputJsonValue
                }
            });
        }
    }
}