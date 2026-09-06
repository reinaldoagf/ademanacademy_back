// src/seating-map/dto/create-seating-map-element.dto.ts
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { SeatingMapType, SeatingMapItemType } from '@prisma/client';

export class CreateSeatingMapElementDto {
    @IsString()
    itemID: string;

    @IsEnum(SeatingMapType)
    type: SeatingMapType;

    @IsEnum(SeatingMapItemType)
    itemType: SeatingMapItemType;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    chairNumber?: string;

    @IsOptional()
    @IsString()
    macroGroupId?: string;

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

    @IsOptional()
    @IsNumber()
    limitPerRepresentative?: number;

    @IsNumber()
    rotation: number;

    @IsOptional()
    @IsNumber()
    groupRotation?: number;


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