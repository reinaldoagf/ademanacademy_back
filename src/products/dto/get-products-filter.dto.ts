import { IsOptional, IsString, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum StockFilterEnum {
    ALL = 'all',
    IN_STOCK = 'in_stock',
    OUT_OF_STOCK = 'out_of_stock',
}
export class GetProductsFilterDto {
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
    @IsString()
    categoryId?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsEnum(StockFilterEnum)
    stockStatus?: StockFilterEnum = StockFilterEnum.ALL;
}