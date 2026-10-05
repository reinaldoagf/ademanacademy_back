// src/costumes/dto/create-costume-image.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateCostumeImageDto {
    @IsString()
    url: string;

    @IsString()
    key: string;

    @IsOptional()
    @IsString()
    altText?: string;

    @IsOptional()
    @IsNumber()
    order?: number;

    @IsOptional()
    @IsString()
    type?: string;
}