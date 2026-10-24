import { IsString, IsArray, ValidateNested, IsOptional, IsNotEmpty, IsEnum, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentStatus } from '@prisma/client';

export class StudentAssignmentItemDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID del estudiante es requerido' })
    studentId: string;

    @IsOptional()
    @IsString()
    observations?: string;

    @IsOptional()
    @IsBoolean()
    issuePaymentOrder: boolean;

    @IsOptional()
    @IsString()
    assignedSize?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    returnDate?: Date;
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