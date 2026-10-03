// src/events/dto/create-event-image.dto.ts
import { IsString, IsOptional, IsEnum, IsInt, IsUrl, Min } from 'class-validator';
import { ImageRole } from '@prisma/client';

export class CreateEventImageDto {
    @IsString({ message: 'La URL debe ser una cadena de texto' })
    url: string;

    @IsString({ message: 'El texto alternativo debe ser una cadena de texto' })
    @IsOptional()
    altText?: string;

    @IsEnum(ImageRole, { message: 'El rol de la imagen no es válido' })
    @IsOptional()
    type?: ImageRole;

    @IsInt({ message: 'El orden debe ser un número entero' })
    @Min(0, { message: 'El orden no puede ser menor a 0' })
    @IsOptional()
    order?: number;
}