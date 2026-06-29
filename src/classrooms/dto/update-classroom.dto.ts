// src/classrooms/dto/update-classroom.dto.ts
import { PartialType } from '@nestjs/mapped-types'; // O '@nestjs/swagger' si usas Swagger
import { CreateClassroomDto } from './create-classroom.dto';
import { IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateClassroomDto extends PartialType(CreateClassroomDto) {

    // 🌟 Añadimos las propiedades del payload que no existen en "CreateClassroom"
    // Al decorarlas con @IsOptional(), class-validator las aceptará en el whitelist sin exigir que vengan siempre.

    @IsString()
    @IsOptional()
    id?: string;

    @IsString()
    @IsOptional()
    createdAt?: string;

    @IsString()
    @IsOptional()
    updatedAt?: string;

    @IsArray()
    @IsOptional()
    groups?: any[];

    @IsArray()
    @IsOptional()
    schedules?: any[];
}