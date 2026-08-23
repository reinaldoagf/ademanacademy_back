import {
    IsString,
    IsNumber,
    IsOptional,
    IsEnum,
    IsDateString,
    IsNotEmpty,
    Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePayablePaymentDto {
    @IsNumber({}, { message: 'El monto debe ser un número' })
    @Min(0.01, { message: 'El monto del abono debe ser mayor a 0' })
    amount: number;

    @IsEnum(PaymentMethod, { message: 'Método de pago no válido' })
    @IsNotEmpty({ message: 'El método de pago es obligatorio' })
    method: PaymentMethod;

    @IsDateString({}, { message: 'La fecha de pago debe ser válida' })
    @IsOptional()
    paymentDate?: string;

    @IsString()
    @IsOptional()
    referenceNumber?: string;

    @IsString()
    @IsOptional()
    receiptUrl?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}