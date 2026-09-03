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

    @IsString()
    @IsOptional()
    groupId?: string; // Add this field

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
    heightMeters: number;
}