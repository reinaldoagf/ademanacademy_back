// src/users/dto/complete-onboarding.dto.ts
import { IsEnum, IsNotEmpty, IsString, IsArray, ValidateNested, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Kinship } from '@prisma/client';

export enum ProfileType {
    STUDENT = 'student',
    REPRESENTATIVE = 'representative',
}

export class RepresentedStudentDto {
    @IsString()
    id: string;

    @IsString()
    @IsNotEmpty({ message: 'El nombre del estudiante es obligatorio.' })
    firstName: string;

    @IsString()
    @IsNotEmpty({ message: 'El apellido del estudiante es obligatorio.' })
    lastName: string;

    // 🎯 CAMBIO: El DNI del alumno ahora es opcional
    @IsString()
    @IsOptional()
    dni?: string;

    @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida.' })
    birthDate: string;

    @IsEnum(Kinship)
    @IsOptional()
    kinship?: Kinship;

    // 🎯 NUEVOS CAMPOS DEL ALUMNO INTEGRADOS
    @IsString()
    @IsNotEmpty({ message: 'La dirección de habitación es obligatoria.' })
    address: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsNotEmpty({ message: 'La talla de franela es obligatoria.' })
    shirtSize: string;

    @IsBoolean({ message: 'El campo de experiencia debe ser un valor booleano.' })
    @IsNotEmpty()
    hasExperience: boolean;

    @IsString()
    @IsOptional()
    medicalObservations?: string;

    @IsString()
    @IsNotEmpty({ message: 'El grupo a inscribir al alumno es obligatorio.' })
    group: string;
}

export class CompleteOnboardingDto {
    @IsEnum(ProfileType, { message: 'El rol seleccionado no es válido.' })
    @IsNotEmpty()
    profileType: ProfileType;

    // 🎯 NUEVO: Ocupación obligatoria para el perfil de Representante
    @IsString()
    @IsOptional()
    representativeOccupation?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RepresentedStudentDto)
    representedStudents?: RepresentedStudentDto[];
}