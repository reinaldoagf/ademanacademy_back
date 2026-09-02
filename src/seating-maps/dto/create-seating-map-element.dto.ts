// src/seating-map/dto/create-seating-map-element.dto.ts
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateSeatingMapElementDto {
    @IsString()
    itemID: string;

    @IsString()
    type: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    chairNumber?: string;

    @IsOptional()
    @IsString()
    grupoId?: string;

    @IsOptional()
    @IsNumber()
    x?: number;

    @IsOptional()
    @IsNumber()
    y?: number;

    @IsOptional()
    @IsNumber()
    width?: number;

    @IsOptional()
    @IsNumber()
    height?: number;

    @IsNumber()
    rotation: number;

    @IsOptional()
    @IsNumber()
    groupRotation?: number; // 👈 Agregado para cumplir con el esquema de Prisma

    @IsNumber()
    price: number;

    @IsNumber()
    xMeters: number;

    @IsNumber()
    yMeters: number;

    @IsNumber()
    widthMeters: number;

    @IsNumber()
    tallMeters: number;
}