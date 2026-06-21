import { IsOptional, IsString, IsInt, Min, IsEnum } from "class-validator";
import { Transform } from "class-transformer";
import { ConceptType } from "@prisma/client";

export class GetTransactionsFilterDto {
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
    @IsEnum(ConceptType)
    concept?: ConceptType;
}