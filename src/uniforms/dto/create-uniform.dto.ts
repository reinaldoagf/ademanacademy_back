// /src/uniforms/dto/create-uniform.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { LockerRoomCategory, LockerRoomStatus } from '@prisma/client';

export class SizeStockDto {
    @IsString()
    size: string;

    // 🌟 CORRECCIÓN: Agrega decoradores para que class-validator reconozca la propiedad
    @IsInt({ message: 'La cantidad debe ser un número entero' })
    @Min(0, { message: 'La cantidad mínima es 0' })
    @Type(() => Number)
    quantity: number;
}

export class CreateUniformDto {
    @IsString()
    name: string;

    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número válido con máximo 2 decimales' })
    @Min(0, { message: 'El precio no puede ser negativo' })
    @Type(() => Number)
    @IsOptional()
    price?: number;

    @IsString()
    @IsOptional()
    beat?: string;

    @IsEnum(LockerRoomCategory)
    @IsOptional()
    category?: LockerRoomCategory;

    @IsEnum(LockerRoomStatus)
    @IsOptional()
    status?: LockerRoomStatus;

    @IsString()
    @IsOptional()
    images?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SizeStockDto)
    @IsOptional()
    availableSizes?: SizeStockDto[];
}