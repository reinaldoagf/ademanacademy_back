import { IsString, IsEnum, IsOptional } from 'class-validator';

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
    studentId: string;

    @IsEnum(AssignmentSize)
    assignedSize: AssignmentSize;

    @IsOptional()
    @IsString()
    observations?: string;
}

export class UpdateAssignmentStatusDto {
    @IsEnum(AssignmentStatus)
    status: AssignmentStatus;

    @IsOptional()
    @IsString()
    observations?: string;
}