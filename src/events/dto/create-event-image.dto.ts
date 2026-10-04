// src/events/dto/create-event-image.dto.ts
import { IsString, IsOptional, IsEnum, IsInt, IsUrl, Min, IsNumber } from 'class-validator';
import { ImageRole } from '@prisma/client';


export class CreateEventImageDto {
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