// create-student.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsUUID, IsBoolean } from 'class-validator';
import { Kinship } from '@prisma/client';

export class CreateStudentDto {
    // 🎯 CAMBIO: El DNI ahora es opcional
    @IsString()
    @IsOptional()
    dni?: string;

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

    // 🎯 NUEVOS CAMPOS VALIDADOS
    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsOptional()
    // Puedes usar @IsPhone() si deseas validar un patrón global estricto, 
    // pero @IsString() es más flexible para formatos locales de guiones/paréntesis.
    phone?: string;

    @IsString()
    @IsNotEmpty()
    shirtSize: string;

    @IsBoolean()
    @IsNotEmpty()
    hasExperience: boolean;

    @IsString()
    @IsNotEmpty()
    group: string;

    @IsUUID()
    @IsOptional() // 💡 Opcional en el payload
    userId?: string;
}