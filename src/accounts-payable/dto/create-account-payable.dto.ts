import {
    IsString,
    IsNumber,
    IsOptional,
    IsDateString,
    IsNotEmpty,
    Min,
} from 'class-validator';

export class CreateAccountPayableDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre del proveedor es obligatorio' })
    supplierName: string;

    @IsString()
    @IsOptional()
    supplierDni?: string;

    @IsString()
    @IsOptional()
    invoiceNumber?: string;

    @IsString()
    @IsNotEmpty({ message: 'El concepto es obligatorio' })
    concept: string;

    @IsNumber({}, { message: 'El monto total debe ser un número' })
    @Min(0.01, { message: 'El monto total debe ser mayor a 0' })
    amountTotal: number;

    @IsDateString({}, { message: 'La fecha de vencimiento debe ser una fecha válida' })
    @IsNotEmpty({ message: 'La fecha de vencimiento es obligatoria' })
    dueDate: string;

    @IsString()
    @IsOptional()
    notes?: string;
}