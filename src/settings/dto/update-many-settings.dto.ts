import { IsArray, ValidateNested, IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingItemDto {
    @IsString()
    @IsNotEmpty()
    key: string;

    @IsString()
    @IsNotEmpty()
    value: string;

    @IsBoolean()
    @IsOptional()
    active?: boolean;
}

export class UpdateManySettingsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SettingItemDto)
    settings: SettingItemDto[];
}