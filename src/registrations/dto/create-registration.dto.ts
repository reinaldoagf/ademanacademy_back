// src/registrations/dto/create-registration.dto.ts
import {
    IsString,
    IsOptional,
    IsNumber,
    IsBoolean,
    ValidateNested,
    IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class PaymentDto {
    @IsString()
    @IsNotEmpty()
    bankName!: string;

    @IsString()
    @IsNotEmpty()
    referenceNumber!: string;

    @IsNumber()
    @Type(() => Number)
    amount!: number;

    @IsString()
    @IsNotEmpty()
    receiptPath!: string; // 👈 URL de S3 generada en el cliente // (TODO: subida de imagen)

    @IsOptional()
    @IsBoolean()
    isEnrolled?: boolean;

    @IsOptional()
    @IsString()
    clientId?: string;
}

export class CreateRegistrationDto {

    @IsString()
    @IsNotEmpty()
    profileType!: string; // Ej: "Representante" o "Estudiante"

    @IsOptional()
    representedStudents?: any[]; // O un DTO específico para los estudiantes representados si lo requieres

    @IsOptional()
    @ValidateNested()
    @Type(() => PaymentDto)
    payment?: PaymentDto;

}