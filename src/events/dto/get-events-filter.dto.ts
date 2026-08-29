// /src/events/dto/get-events-filter.dto.ts
import { IsOptional, IsString, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, ProductionStatus } from '@prisma/client';

export class GetEventsFilterDto {
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

    @IsOptional()
    @IsEnum(EventType, {
        message: `type debe ser un valor válido: ${Object.values(EventType).join(', ')}`,
    })
    type?: EventType;

    @IsOptional()
    @IsEnum(ProductionStatus, {
        message: `productionStatus debe ser un valor válido: ${Object.values(ProductionStatus).join(', ')}`,
    })
    productionStatus?: ProductionStatus;

    @IsOptional()
    @IsDateString({}, { message: 'startDate debe ser una fecha válida en formato ISO (YYYY-MM-DD)' })
    startDate?: string;

    @IsOptional()
    @IsDateString({}, { message: 'endDate debe ser una fecha válida en formato ISO (YYYY-MM-DD)' })
    endDate?: string;
}