import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateSettingDto {
    @IsString()
    @IsOptional()
    id?: string;

    @IsString()
    @IsNotEmpty()
    value: string;

    @IsString()
    @IsNotEmpty()
    key: string;

    @IsBoolean()
    @IsOptional()
    active?: boolean;

}