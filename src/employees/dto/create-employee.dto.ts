// /src/costumes/dto/create-costume.dto.ts
import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { LockerRoomCategory, LockerRoomStatus, PayrollStatus, TypeOfContract, TypeOfEmployee } from '@prisma/client';

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
    firstName: string;
    lastName: string;

    @IsString()
    @IsOptional()
    IDNumberPrefix?: string;

    @IsString()
    @IsOptional()
    dni?: string;

    @IsEnum(TypeOfContract)
    @IsOptional()
    typeOfContract?: TypeOfContract;

    @IsEnum(TypeOfEmployee)
    @IsOptional()
    typeOfEmployee?: TypeOfEmployee;

    @IsDateString()
    birthDate: string;

    @IsString()
    @IsOptional()
    countryCode?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    address: string;

    @IsString()
    @IsOptional()
    medicalObservations?: string;

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

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    hoursTaughtMonth?: number;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    hourlyRate?: number;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    bonus?: number;

    @IsEnum(PayrollStatus)
    @IsOptional()
    payrollStatus?: PayrollStatus;

    userId?: string;

    @IsArray()
    @IsOptional()
    groupIds?: string[];

}