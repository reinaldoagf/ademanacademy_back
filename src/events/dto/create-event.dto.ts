// /src/events/dto/create-event.dto.ts
import {
    IsString,
    IsOptional,
    IsEnum,
    IsDateString,
    IsInt,
    IsNumber,
    Min
} from 'class-validator';
import { Type } from 'class-transformer';
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

    @IsString({ message: 'La ubicación es obligatoria' })
    location: string;

    @IsInt({ message: 'Las entradas vendidas deben ser un número entero' })
    @Min(0, { message: 'Las entradas vendidas no pueden ser negativas' })
    @Type(() => Number)
    @IsOptional()
    ticketsSold?: number;

    @IsInt({ message: 'El aforo total debe ser un número entero' })
    @Min(0, { message: 'El aforo total no puede ser negativo' })
    @Type(() => Number)
    @IsOptional()
    totalTickets?: number;

    @IsNumber({}, { message: 'El precio de la entrada debe ser un número válido' })
    @Min(0, { message: 'El precio no puede ser negativo' })
    @Type(() => Number)
    ticketPrice: number;

    @IsEnum(ProductionStatus, { message: 'El estado de producción no es válido' })
    @IsOptional()
    productionStatus?: ProductionStatus;

    @IsString({ message: 'La descripción debe ser una cadena de texto' })
    @IsOptional()
    description?: string;
}