import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ClassroomStatus, ClassroomType } from '@prisma/client';

export class GetClassroomsFilterDto {
    @IsOptional()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    search?: string; // Búsqueda global por Nombre, Apellido o DNI

    @IsOptional()
    @IsEnum(ClassroomStatus)
    status?: ClassroomStatus;

    @IsOptional()
    @IsEnum(ClassroomType)
    type?: ClassroomType;
}