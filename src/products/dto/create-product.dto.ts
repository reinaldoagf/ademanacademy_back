// src/products/dto/create-product.dto.ts
import {
    IsString,
    IsOptional,
    IsNumber,
    IsInt,
    Min,
    IsBoolean,
    ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer'; // 👈 Importar Transform
import { CreateProductImageDto } from './create-product-image.dto';

export class CreateProductDto {
    @IsString({ message: 'El nombre debe ser una cadena de texto' })
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número con máximo 2 decimales' })
    @Min(0, { message: 'El precio no puede ser negativo' })
    @Type(() => Number)
    salePrice: number;

    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El costo debe ser un número con máximo 2 decimales' })
    @Min(0, { message: 'El costo no puede ser negativo' })
    @Type(() => Number)
    cost: number;

    @IsInt({ message: 'El stock actual debe ser un entero' })
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    currentStock?: number;

    @IsInt({ message: 'La alerta de stock mínimo debe ser un entero' })
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    minimumStockAlert?: number;

    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateProductImageDto)
    images?: CreateProductImageDto[];

    // 🌟 Conversión de 'true'/'false' (strings de FormData) a booleanos reales
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsBoolean({ message: 'isActive debe ser un valor booleano' })
    @IsOptional()
    isActive?: boolean;

    @IsBoolean({ message: 'featured debe ser un valor booleano' })
    @IsOptional()
    featured?: boolean;

}