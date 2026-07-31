import { IsOptional, IsString, IsEnum, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { TypeOfContract, PayrollStatus, TypeOfEmployee } from '@prisma/client';

export class GetEmployeesFilterDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(TypeOfContract, {
        message: `typeOfContract debe ser un valor válido: ${Object.values(TypeOfContract).join(', ')}`,
    })
    typeOfContract?: TypeOfContract;

    @IsOptional()
    @IsEnum(TypeOfEmployee, {
        message: `TypeOfEmployee debe ser un valor válido: ${Object.values(TypeOfEmployee).join(', ')}`,
    })
    typeOfEmployee?: TypeOfEmployee;

    @IsOptional()
    @IsEnum(PayrollStatus, {
        message: `payrollStatus debe ser un valor válido: ${Object.values(PayrollStatus).join(', ')}`,
    })
    payrollStatus?: PayrollStatus;

    @IsOptional()
    @IsUUID('4', { message: 'groupId debe ser un UUID válido.' })
    groupId?: string;
}