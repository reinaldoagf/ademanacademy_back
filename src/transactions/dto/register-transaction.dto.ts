import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsNumber,
    IsEnum,
    IsPositive,
    MinLength,
    MaxLength,
    IsObject,
    ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';
// Sub-DTO para la imagen del comprobante en S3 (reutilizable)
class S3ImageDto {
    @IsString()
    @IsNotEmpty({ message: 'La URL del comprobante es obligatoria.' })
    url!: string;

    @IsString()
    @IsNotEmpty({ message: 'La clave (key) del comprobante es obligatoria.' })
    key!: string;
}
export class RegisterTransactionDto {
    @IsNotEmpty({ message: 'El ID de la orden de pago es obligatorio.' })
    @IsString({ message: 'El ID de la orden de pago debe ser una cadena de texto.' })
    paymentOrderId: string;

    @IsOptional()
    @IsString({ message: 'El ID del estudiante debe ser una cadena de texto.' })
    studentId?: string;

    @IsNotEmpty({ message: 'El método de pago es obligatorio.' })
    @IsEnum(PaymentMethod, {
        message: 'El método de pago proporcionado no es válido.',
    })
    method: PaymentMethod;

    @IsNotEmpty({ message: 'El monto transferido/pagado es obligatorio.' })
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser un número válido con máximo 2 decimales.' })
    @IsPositive({ message: 'El monto debe ser mayor a cero.' })
    amount: number;

    @IsOptional()
    @IsString({ message: 'El número de referencia debe ser una cadena de texto.' })
    @MinLength(4, { message: 'El número de referencia debe tener al menos 4 caracteres.' })
    @MaxLength(100, { message: 'El número de referencia no puede exceder 100 caracteres.' })
    referenceNumber?: string;

    @IsOptional()
    @IsString({ message: 'El nombre del banco debe ser una cadena de texto.' })
    @MaxLength(100, { message: 'El nombre del banco no puede exceder 100 caracteres.' })
    bankName?: string;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => S3ImageDto)
    imageOfPaymentReceipt?: S3ImageDto | null;
}