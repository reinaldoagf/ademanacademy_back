// src/events/dto/create-sponsor.dto.ts
import { IsString, IsOptional, IsEnum, IsUrl, IsObject } from 'class-validator';
import { SponsorTier } from '@prisma/client';

export class CreateSponsorDto {
    @IsString({ message: 'El nombre del patrocinador es obligatorio' })
    name: string;

    @IsString({ message: 'El logo debe ser una URL o cadena válida' })
    logoUrl: string;

    @IsEnum(SponsorTier, { message: 'El nivel de patrocinio no es válido' })
    @IsOptional()
    tier?: SponsorTier;

    @IsUrl({}, { message: 'El sitio web debe ser una URL válida' })
    @IsOptional()
    websiteUrl?: string;

    @IsObject({ message: 'Las redes sociales deben ser un objeto JSON válido' })
    @IsOptional()
    socialLinks?: Record<string, any>;
}