// dto/reserve-seats.dto.ts
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsNumber, IsPositive, IsUUID } from 'class-validator';
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
    @IsNotEmpty({ message: 'El usuario es requerido.' })
    userId: string;

    @IsUUID()
    @IsOptional()
    studentId?: string;

    @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser un número válido.' })
    @IsPositive({ message: 'El monto debe ser mayor a cero.' })
    totalAmount: number;

}