import { IsString, IsNotEmpty, IsInt, IsEnum, IsOptional, Min } from 'class-validator';
import { ClassroomType, ClassroomStatus } from '@prisma/client';

export class CreateClassroomDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsInt()
    @Min(1)
    maxCapacity: number;

    @IsEnum(ClassroomType)
    type: ClassroomType;

    @IsEnum(ClassroomStatus)
    @IsOptional()
    status?: ClassroomStatus;

    @IsString()
    @IsOptional()
    description?: string;
}