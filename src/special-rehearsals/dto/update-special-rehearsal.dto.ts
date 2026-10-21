import {
    IsString,
    IsOptional,
    IsArray,
    IsDateString,
    Matches,
} from 'class-validator';
export class UpdateSpecialRehearsalDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsDateString()
    date?: string;

    @IsOptional()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    startTime?: string;

    @IsOptional()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    endTime?: string;

    @IsOptional()
    @IsString()
    classroomId?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    studentIds?: string[];
}