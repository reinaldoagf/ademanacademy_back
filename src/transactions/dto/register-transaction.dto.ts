import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsNumber,
    IsEnum,
    IsPositive,
    MinLength,
    MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class RegisterTransactionDto {
    @IsNotEmpty({ message: 'El ID de la orden de pago es obligatorio.' })
    @IsString({ message: 'El ID de la orden de pago debe ser una cadena de texto.' })
    paymentOrderId: string;

    @IsNotEmpty({ message: 'El ID del usuario es obligatorio.' })
    @IsString({ message: 'El ID del usuario debe ser una cadena de texto.' })
    userId: string;

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
    @IsString({ message: 'La ruta/URL del comprobante debe ser una cadena de texto.' })
    @MaxLength(255, { message: 'La ruta del comprobante no puede exceder 255 caracteres.' })
    receiptPath?: string;
}