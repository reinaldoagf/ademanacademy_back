// src/groups/dto/get-group-slots-options.dto.ts
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetGroupSlotsOptionsDto {
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    onlyActive?: boolean = true; // Por defecto true
}
