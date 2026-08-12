import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { LockerRoomCategory, LockerRoomStatus } from '@prisma/client';

export class GetUniformsFilterDto {
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(LockerRoomCategory)
    category?: LockerRoomCategory;

    @IsOptional()
    @IsEnum(LockerRoomStatus)
    status?: LockerRoomStatus;
}