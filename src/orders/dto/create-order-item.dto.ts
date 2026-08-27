import { IsNotEmpty, IsString, IsOptional, IsEnum, IsInt, IsNumber, Min } from 'class-validator';
import { ConceptType } from '@prisma/client';

export class CreateOrderItemDto {
    @IsOptional()
    @IsString()
    elementId?: string;

    @IsOptional()
    @IsString()
    studentId?: string;

    @IsNotEmpty({ message: 'El concepto es obligatorio' })
    @IsEnum(ConceptType, { message: 'El concepto no es válido' })
    concept: ConceptType;

    @IsOptional()
    @IsString()
    conceptLabel?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty({ message: 'La cantidad es obligatoria' })
    @IsInt({ message: 'La cantidad debe ser un número entero' })
    @Min(1, { message: 'La cantidad debe ser al menos 1' })
    quantity: number;

    @IsNotEmpty({ message: 'El precio unitario es obligatorio' })
    @IsNumber({}, { message: 'El precio debe ser un número decimal' })
    @Min(0, { message: 'El precio no puede ser negativo' })
    price: number;
}