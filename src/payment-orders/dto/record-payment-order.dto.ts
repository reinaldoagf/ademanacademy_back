// src/payment-orders/dto/record-payment-order.dto.ts
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsObject,
    ValidateNested,
    IsEnum
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus } from '@prisma/client';

// Sub-DTO para la imagen del comprobante en S3 (reutilizable)
class S3ImageDto {
    @IsString()
    @IsNotEmpty({ message: 'La URL del comprobante es obligatoria.' })
    url!: string;

    @IsString()
    @IsNotEmpty({ message: 'La clave (key) del comprobante es obligatoria.' })
    key!: string;
}

export class RecordPaymentOrderDto {
    @IsString()
    @IsOptional()
    id!: string;

    @IsString()
    @IsNotEmpty({ message: 'El número de referencia es obligatorio.' })
    referenceNumber!: string;

    @IsString()
    @IsNotEmpty({ message: 'El nombre del banco es obligatorio.' })
    bankName!: string;

    @IsNumber({}, { message: 'El monto debe ser un número válido.' })
    @IsNotEmpty({ message: 'El monto es obligatorio.' })
    @Type(() => Number) // Transforma automáticamente strings numéricos (ej: "35") a tipo number
    amount!: number;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => S3ImageDto)
    imageOfPaymentReceipt?: S3ImageDto | null;

    @IsString()
    @IsOptional()
    userId!: string;

    @IsEnum(TransactionStatus)
    @IsOptional()
    status!: TransactionStatus;
}