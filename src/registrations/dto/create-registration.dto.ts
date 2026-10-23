// src/registrations/dto/create-registration.dto.ts
import {
    IsString,
    IsOptional,
    IsNumber,
    IsBoolean,
    ValidateNested,
    IsNotEmpty,
    IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
// Sub-DTO para la imagen del comprobante en S3 (reutilizable)
class S3ImageDto {
    @IsString()
    @IsNotEmpty({ message: 'La URL del comprobante es obligatoria.' })
    url!: string;

    @IsString()
    @IsNotEmpty({ message: 'La clave (key) del comprobante es obligatoria.' })
    key!: string;
}
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

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => S3ImageDto)
    imageOfPaymentReceipt?: S3ImageDto | null;

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