// src/fixed-expenses/dto/create-fixed-expenses.dto.ts
import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsBoolean,
    IsEnum,
    IsDateString,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enum sincronizado con Prisma
export enum ExpenseFrequencyDto {
    Semanal = 'Semanal',
    Quincenal = 'Quincenal',
    Mensual = 'Mensual',
    Anual = 'Anual',
}

export class CreateFixedExpenseDto {
    @IsString()
    @IsNotEmpty({ message: 'El título del gasto fijo es obligatorio.' })
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber({}, { message: 'El monto debe ser un número válido.' })
    @Min(0.01, { message: 'El monto debe ser mayor a cero.' })
    @Type(() => Number)
    amount!: number;

    @IsEnum(ExpenseFrequencyDto, { message: 'Frecuencia inválida. Seleccione Semanal, Quincenal, Mensual o Anual.' })
    @IsNotEmpty({ message: 'La frecuencia es obligatoria.' })
    frequency!: ExpenseFrequencyDto;

    @IsDateString({}, { message: 'La próxima fecha de vencimiento debe tener un formato de fecha válido (YYYY-MM-DD).' })
    @IsNotEmpty({ message: 'La fecha de vencimiento es obligatoria.' })
    nextDueDate!: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    supplierId?: string;
}