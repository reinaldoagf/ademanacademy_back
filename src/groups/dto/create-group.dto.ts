// src/groups/dto/create-group.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
// 1. ✨ IMPORTA EL ENUM DESDE EL CLIENTE DE PRISMA
import { GroupCategory } from '@prisma/client';


export class CreateGroupDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre del grupo es obligatorio.' })
    name: string;

    @IsString()
    @IsOptional()
    style?: string;

    @IsEnum(GroupCategory, { message: 'La categoría seleccionada no es válida.' })
    @IsNotEmpty()
    category: GroupCategory;

    @IsNumber({}, { message: 'El número total de cupos debe ser un número.' })
    @Min(1, { message: 'El grupo debe tener al menos 1 cupo disponible.' })
    totalNumberOfSlots: number;

    @IsNumber()
    @IsOptional()
    usedSlots?: number = 0;

    @IsString()
    @IsNotEmpty({ message: 'Debes asignar un salón de clases válido.' })
    classroomId: string;

    @IsString()
    @IsNotEmpty({ message: 'Debes asignar un instructor responsable.' })
    instructorId: string;
}