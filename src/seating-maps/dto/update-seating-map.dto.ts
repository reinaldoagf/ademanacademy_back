import { PartialType } from '@nestjs/mapped-types';
import { CreateSeatingMapDto } from './create-seating-map.dto';
import { IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateSeatingMapDto extends PartialType(CreateSeatingMapDto) {

    @IsString()
    @IsOptional()
    id?: string;

    @IsString()
    @IsOptional()
    createdAt?: string;

    @IsString()
    @IsOptional()
    updatedAt?: string;
}