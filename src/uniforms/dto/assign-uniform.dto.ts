import { IsString, IsArray, ValidateNested, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum AssignmentStatus {
    assigned = 'assigned',
    returned = 'returned',
    damaged = 'damaged',
    lost = 'lost',
}

export class StudentAssignmentItemDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID del estudiante es requerido' })
    studentId: string;

    @IsString()
    @IsNotEmpty({ message: 'La talla asignada es requerida' })
    assignedSize: string;

    @IsOptional()
    @IsString()
    observations?: string;
}

export class AssignUniformDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID del uniforme es requerido' })
    uniformId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StudentAssignmentItemDto)
    assignments: StudentAssignmentItemDto[];
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