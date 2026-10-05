// src/uniforms/dto/create-uniform-image.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateUniformImageDto {
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