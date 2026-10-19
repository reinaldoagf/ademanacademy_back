// /src/fixed-expenses/dto/get-fixed-expenses-filter.dto.ts
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetFixedExpensesFilterDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'page debe ser un número entero' })
    @Min(1, { message: 'page debe ser al menos 1' })
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'limit debe ser un número entero' })
    @Min(1, { message: 'limit debe ser al menos 1' })
    limit?: number = 10;

    @IsOptional()
    @IsString({ message: 'search debe ser una cadena de texto' })
    search?: string;


}