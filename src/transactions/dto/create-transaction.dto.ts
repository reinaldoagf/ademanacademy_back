// src/transactions/dto/create-transaction.dto.ts
import { IsEnum, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { ConceptType, PaymentMethod, TransactionStatus } from '@prisma/client';

export class CreateTransactionDto {
    @IsString()
    @IsNotEmpty({ message: 'El ID del usuario es obligatorio.' })
    userId: string;

    @IsEnum(ConceptType, { message: 'El concepto de pago no es válido.' })
    concept: ConceptType;

    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser un número válido.' })
    @IsPositive({ message: 'El monto debe ser mayor a cero.' })
    amount: number;

    @IsEnum(PaymentMethod, { message: 'El método de pago no es válido.' })
    method: PaymentMethod;

    @IsEnum(TransactionStatus, { message: 'El estado no es válido.' })
    status: TransactionStatus;
}