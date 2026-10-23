// src/transactions/dto/create-transaction.dto.ts
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsObject, ValidateNested } from 'class-validator';
import { ConceptType, PaymentMethod, TransactionStatus } from '@prisma/client';
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
export class CreateTransactionDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID del cliente es obligatorio.' })
    clientId: string;

    @IsString()
    @IsNotEmpty({ message: 'El ID de la orden de pago es obligatorio.' })
    paymentOrderId: string;

    @IsEnum(ConceptType, { message: 'El concepto de pago no es válido.' })
    concept: ConceptType;

    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser un número válido.' })
    @IsPositive({ message: 'El monto debe ser mayor a cero.' })
    amount: number;

    @IsString()
    @IsNotEmpty({ message: 'El número de referencia es obligatorio.' })
    referenceNumber: string;

    @IsString()
    @IsNotEmpty({ message: 'El nombre del banco es obligatorio.' })
    bankName: string;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => S3ImageDto)
    imageOfPaymentReceipt?: S3ImageDto | null;

    @IsEnum(PaymentMethod, { message: 'El método de pago no es válido.' })
    method: PaymentMethod;

    @IsEnum(TransactionStatus, { message: 'El estado no es válido.' })
    status: TransactionStatus;
}