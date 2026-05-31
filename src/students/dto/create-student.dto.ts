import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { Kinship } from '@prisma/client';

export class CreateStudentDto {
    @IsString()
    @IsNotEmpty()
    dni: string;

    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsDateString()
    @IsNotEmpty()
    birthDate: string;

    @IsEnum(Kinship)
    @IsOptional()
    kinship?: Kinship;

    @IsString()
    @IsOptional()
    medicalObservations?: string;

    @IsUUID()
    @IsOptional() // 💡 Opcional en el payload
    userId?: string;
}