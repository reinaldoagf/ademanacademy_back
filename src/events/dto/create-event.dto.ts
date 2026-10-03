// src/events/dto/create-event.dto.ts
import {
    IsString,
    IsOptional,
    IsEnum,
    IsDateString,
    IsBoolean,
    IsArray,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, ProductionStatus } from '@prisma/client';
import { CreateEventImageDto } from './create-event-image.dto';
import { CreateSponsorDto } from './create-sponsor.dto';

export class CreateEventDto {

    @IsString({ message: 'El nombre es obligatorio' })
    name: string;

    @IsEnum(EventType, { message: 'El tipo de evento no es válido' })
    @IsOptional()
    type?: EventType;

    @IsDateString({}, { message: 'La fecha de inicio debe tener un formato de fecha válido (ISO8601)' })
    startDate: string;

    @IsDateString({}, { message: 'La fecha de fin debe tener un formato de fecha válido (ISO8601)' })
    endDate: string;

    @IsBoolean({ message: 'isPresaleActive debe ser un valor booleano' })
    @IsOptional()
    isPresaleActive?: boolean;

    @IsDateString({}, { message: 'La fecha de inicio de preventa debe ser ISO8601' })
    @IsOptional()
    presaleStartDate?: string;

    @IsDateString({}, { message: 'La fecha de fin de preventa debe ser ISO8601' })
    @IsOptional()
    presaleEndDate?: string;

    @IsEnum(ProductionStatus, { message: 'El estado de producción no es válido' })
    @IsOptional()
    productionStatus?: ProductionStatus;

    @IsString({ message: 'La descripción debe ser una cadena de texto' })
    @IsOptional()
    description?: string;

    @IsString({ message: 'El mapa de asientos es obligatorio' })
    @IsOptional()
    seatingMapId?: string;

    // 🎯 Imágenes relacionadas
    @IsArray({ message: 'Las imágenes deben enviarse como una lista' })
    @ValidateNested({ each: true })
    @Type(() => CreateEventImageDto)
    @IsOptional()
    images?: CreateEventImageDto[];

    // 🎯 Patrocinadores
    @IsArray({ message: 'Los patrocinadores deben enviarse como una lista' })
    @ValidateNested({ each: true })
    @Type(() => CreateSponsorDto)
    @IsOptional()
    sponsors?: CreateSponsorDto[];
}