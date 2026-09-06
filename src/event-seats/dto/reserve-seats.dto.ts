// dto/reserve-seats.dto.ts
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
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
    @IsOptional()
    userId?: string;

    @IsUUID()
    @IsOptional()
    studentId?: string;
}