// src/users/dto/complete-onboarding.dto.ts
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsArray,
    ValidateNested,
    IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// Sub-DTO para los datos de pago
class PaymentDto {
    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    referenceNumber?: string;

    @IsOptional()
    @IsNumber()
    amount?: number;

    @IsOptional()
    @IsBoolean()
    isEnrolled?: boolean;

    @IsOptional()
    @IsString()
    studentId?: string;
}

// Sub-DTO para la imagen del comprobante en S3
class S3ImageDto {
    @IsString()
    @IsNotEmpty({ message: 'La URL de la imagen es obligatoria.' })
    url!: string;

    @IsString()
    @IsNotEmpty({ message: 'La clave (key) de la imagen es obligatoria.' })
    key!: string;
}

export class CompleteOnboardingDto {
    @IsString()
    @IsNotEmpty({ message: 'El tipo de perfil es obligatorio.' })
    profileType: string;

    @IsBoolean()
    isEnrolled!: boolean;

    @IsOptional()
    @IsString()
    studentId?: string;

    @IsOptional()
    @IsString()
    representativeOccupation?: string;

    @IsArray({ message: 'Los estudiantes representados deben enviarse en un arreglo.' })
    @IsOptional()
    representedStudents?: any[]; // Puedes tiparlo con tu entidad Student si lo prefieres

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => PaymentDto)
    payment?: PaymentDto | null;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => S3ImageDto)
    imageOfPaymentReceipt?: S3ImageDto | null;
}