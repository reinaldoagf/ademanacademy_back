import { IsString, IsArray, ValidateNested, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentStatus } from '@prisma/client';

export class StudentAssignmentItemDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID del estudiante es requerido' })
    studentId: string;

    @IsOptional()
    @IsString()
    observations?: string;
}

export class AssignCostumeDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID del vestuario es requerido' })
    costumeId: string;

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