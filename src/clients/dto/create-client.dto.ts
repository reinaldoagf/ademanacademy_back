import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, IsNotEmpty, IsUUID, ValidateIf } from 'class-validator';
import { ClientType, Kinship } from '@prisma/client';

export class CreateClientDto {
    @IsOptional()
    @IsString()
    dni?: string;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsDateString()
    birthDate: string;

    @IsString()
    address: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    countryCode?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEnum(ClientType)
    type?: ClientType;

    @IsOptional()
    @IsUUID()
    studentId?: string;

    @IsOptional()
    @ValidateIf((o) => o.userId !== '' && o.userId !== null) // Solo valida UUID si no es '' ni null
    @IsUUID('4', { message: 'userId debe ser un UUID válido' })
    userId?: string | null;

    @IsOptional()
    @IsUUID()
    groupId?: string;


    @IsEnum(Kinship)
    @IsOptional()
    kinship?: Kinship;

    @IsString()
    @IsOptional()
    medicalObservations?: string;

    @IsString()
    @IsOptional()
    shirtSize: string;

    @IsBoolean()
    @IsOptional()
    hasExperience: boolean;
}