// src/special-rehearsals/dto/create-special-rehearsal.dto.ts
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    IsDateString,
    Matches,
} from 'class-validator';

export class CreateSpecialRehearsalDto {
    @IsString()
    @IsNotEmpty({ message: 'El título del ensayo es obligatorio.' })
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsDateString({}, { message: 'La fecha debe tener un formato válido (YYYY-MM-DD).' })
    @IsNotEmpty({ message: 'La fecha del ensayo es obligatoria.' })
    date!: string;

    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'La hora de inicio debe tener formato HH:mm' })
    @IsNotEmpty({ message: 'La hora de inicio es obligatoria.' })
    startTime!: string;

    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'La hora de fin debe tener formato HH:mm' })
    @IsNotEmpty({ message: 'La hora de fin es obligatoria.' })
    endTime!: string;

    // 🌟 Opcional: Salón interno de la academia
    @IsOptional()
    @IsString()
    classroomId?: string;

    // 🌟 Opcional: Ubicación externa libre
    @IsOptional()
    @IsString()
    location?: string;

    @IsArray({ message: 'Los estudiantes deben enviarse en un arreglo de IDs.' })
    @IsString({ each: true })
    @IsOptional()
    studentIds?: string[];
}

