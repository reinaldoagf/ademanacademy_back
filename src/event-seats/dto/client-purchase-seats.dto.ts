import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
// Sub-DTO para la imagen del comprobante en S3 (reutilizable)
class S3ImageDto {
    @IsString()
    @IsNotEmpty({ message: 'La URL del comprobante es obligatoria.' })
    url!: string;

    @IsString()
    @IsNotEmpty({ message: 'La clave (key) del comprobante es obligatoria.' })
    key!: string;
}
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
    @IsObject()
    @ValidateNested()
    @Type(() => S3ImageDto)
    imageOfPaymentReceipt?: S3ImageDto | null;
}