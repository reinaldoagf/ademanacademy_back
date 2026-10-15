import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetNotificationsFilterDto {
    @IsOptional()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    ownerFilter?: boolean;
}