// dto/reserve-seats.dto.ts
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsNumber, IsPositive, IsUUID, Min } from 'class-validator';
import { SeatStatus } from '@prisma/client';

export class ReserveSeatsDto {
    @IsUUID()
    @IsNotEmpty()
    eventId: string;

    @IsArray()
    @IsUUID('4', { each: true })
    @IsNotEmpty()
    seatingMapElementIds: string[];

    @IsEnum(SeatStatus)
    @IsNotEmpty()
    status: SeatStatus; // RESERVED o SOLD

    @IsUUID()
    @IsNotEmpty({ message: 'El cliente es requerido.' })
    clientId: string;

    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser un número válido.' })
    @IsPositive({ message: 'El monto debe ser mayor a cero.' })
    totalAmount: number;

    @IsOptional()
    @IsNumber()
    @Min(1, { message: 'El tiempo de reserva debe ser de al menos 1 minuto.' })
    reservationDurationMinutes?: number;
}