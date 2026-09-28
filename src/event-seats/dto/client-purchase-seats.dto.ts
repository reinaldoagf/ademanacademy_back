import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ClientPurchaseSeatsDto {
    @IsString()
    @IsNotEmpty()
    eventId: string;

    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    seatingMapElementIds: string[];

    @IsNumber()
    @IsNotEmpty()
    totalAmount: number;

    @IsString()
    @IsNotEmpty()
    bankName: string;

    @IsString()
    @IsNotEmpty()
    referenceNumber: string;

    @IsOptional()
    @IsString()
    receiptPath?: string;
}