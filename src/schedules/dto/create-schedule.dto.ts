// src/groups/dto/create-schedule.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// 1. Creamos un Enum para restringir estrictamente los días permitidos
export enum DaysOfWeek {
    LUNES = 'lunes',
    MARTES = 'martes',
    MIERCOLES = 'miércoles',
    JUEVES = 'jueves',
    VIERNES = 'viernes',
    SABADO = 'sábado',
    DOMINGO = 'domingo'
}

// 2. Definimos la estructura interna del bloque
export class BlockDto {
    @IsString()
    @IsOptional() // O @IsNotEmpty() si el ID siempre viene del Front de forma obligatoria
    id: string;

    @IsString()
    @IsNotEmpty({ message: 'La hora de inicio es requerida.' })
    startTime: string;

    @IsString()
    @IsNotEmpty({ message: 'La hora de finalización es requerida.' })
    endTime: string;

    @IsString()
    @IsOptional()
    label: string;
}

// 3. DTO Principal
export class CreateScheduleDto {
    @IsString()
    @IsNotEmpty({ message: 'Debes asignar un grupo válido.' })
    groupId: string;

    @IsString()
    @IsNotEmpty({ message: 'Debes asignar un salón de clases válido.' })
    classroomId: string;

    @IsEnum(DaysOfWeek, { message: 'El día debe ser un día de la semana válido (en minúsculas y con acentos).' })
    @IsNotEmpty({ message: 'El día es requerido.' })
    day: DaysOfWeek;

    @IsObject()
    @IsNotEmpty({ message: 'Los datos del bloque son requeridos.' })
    @ValidateNested() // 🌟 Clave: Valida las propiedades del objeto interno
    @Type(() => BlockDto) // 🌟 Clave: Transforma el objeto genérico al tipo BlockDto
    newBlock: BlockDto;
}