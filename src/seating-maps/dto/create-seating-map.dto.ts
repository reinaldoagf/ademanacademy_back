import { IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSeatingMapElementDto } from './create-seating-map-element.dto';

export class CreateSeatingMapDto {
    @IsNumber()
    totalWidth: number;

    @IsNumber()
    totalHigh: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSeatingMapElementDto)
    elements: CreateSeatingMapElementDto[];
}