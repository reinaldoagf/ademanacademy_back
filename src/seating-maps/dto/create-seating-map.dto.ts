import { IsNumber, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSeatingMapElementDto } from './create-seating-map-element.dto';

export class CreateSeatingMapDto {
    @IsString()
    location: string;

    @IsNumber()
    totalWidth: number;

    @IsNumber()
    totalHeight: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSeatingMapElementDto)
    elements: CreateSeatingMapElementDto[];
}