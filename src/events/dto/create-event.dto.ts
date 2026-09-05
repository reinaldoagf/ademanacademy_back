// /src/events/dto/create-event.dto.ts
import {
    IsString,
    IsOptional,
    IsEnum,
    IsDateString
} from 'class-validator';
import { EventType, ProductionStatus } from '@prisma/client';

export class CreateEventDto {
    @IsString({ message: 'El código debe ser una cadena de texto' })
    @IsOptional()
    code?: string;

    @IsString({ message: 'El nombre es obligatorio' })
    name: string;

    @IsEnum(EventType, { message: 'El tipo de evento no es válido' })
    @IsOptional()
    type?: EventType;

    @IsDateString({}, { message: 'La fecha de inicio debe tener un formato de fecha válido (ISO8601)' })
    startDate: string;

    @IsDateString({}, { message: 'La fecha de fin debe tener un formato de fecha válido (ISO8601)' })
    endDate: string;

    @IsEnum(ProductionStatus, { message: 'El estado de producción no es válido' })
    @IsOptional()
    productionStatus?: ProductionStatus;

    @IsString({ message: 'La descripción debe ser una cadena de texto' })
    @IsOptional()
    description?: string;

    @IsString({ message: 'El mapa de asientos es obligatorio' })
    seatingMapId: string;
}