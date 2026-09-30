import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

export enum AssignmentSize {
    XS = 'XS',
    S = 'S',
    M = 'M',
    L = 'L',
    XL = 'XL',
}

export enum AssignmentStatus {
    assigned = 'assigned',
    returned = 'returned',
    damaged = 'damaged',
    lost = 'lost',
}

export class AssignUniformDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID del estudiante es requerido' })
    studentId: string;

    @IsString()
    @IsNotEmpty({ message: 'El ID del uniforme es requerido' })
    uniformId: string;

    @IsOptional()
    @IsString()
    clientId?: string;

    // Usa IsString si manejas más variaciones de tallas (ej. 32, 34, S, M)
    // o mantén IsEnum(AssignmentSize) si solo usas letras estándar.
    @IsString()
    @IsNotEmpty({ message: 'La talla a asignar es requerida' })
    assignedSize: string;

    @IsOptional()
    @IsString()
    observations?: string;
}

export class UpdateAssignmentStatusDto {
    @IsEnum(AssignmentStatus, {
        message: 'El estado debe ser: assigned, returned, damaged o lost',
    })
    status: AssignmentStatus;

    @IsOptional()
    @IsString()
    observations?: string;
}