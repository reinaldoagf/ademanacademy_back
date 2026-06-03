// src/users/dto/complete-onboarding.dto.ts
import { IsEnum, IsNotEmpty, IsString, IsArray, ValidateNested, IsOptional, IsDateString } from 'class-validator';
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

    @IsString()
    @IsNotEmpty({ message: 'El DNI es obligatorio.' })
    dni: string;

    @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida.' })
    birthDate: string;

    @IsEnum(Kinship)
    @IsOptional()
    kinship?: Kinship;
}

export class CompleteOnboardingDto {
    @IsEnum(ProfileType, { message: 'El rol seleccionado no es válido.' })
    @IsNotEmpty()
    profileType: ProfileType;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RepresentedStudentDto)
    representedStudents?: RepresentedStudentDto[];
}