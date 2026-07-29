// /src/costumes/dto/create-costume.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
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

export class CreateEmployeeDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    beat?: string;

    @IsEnum(LockerRoomCategory)
    @IsOptional()
    category?: LockerRoomCategory;

    @IsEnum(LockerRoomStatus)
    @IsOptional()
    status?: LockerRoomStatus;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SizeStockDto)
    @IsOptional()
    availableSizes?: SizeStockDto[];
}