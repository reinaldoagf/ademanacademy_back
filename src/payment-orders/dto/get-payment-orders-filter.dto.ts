import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ConceptType, PaymentOrderStatus } from '@prisma/client';

export class GetPaymentOrdersFilterDto {
    @IsOptional()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    search?: string; // Búsqueda global por Nombre, Apellido o DNI

    @IsOptional()
    @IsEnum(PaymentOrderStatus)
    status?: PaymentOrderStatus;

    @IsOptional()
    @IsEnum(ConceptType)
    concept?: ConceptType;

}