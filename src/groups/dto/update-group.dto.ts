// src/groups/dto/update-group.dto.ts
import { PartialType } from '@nestjs/mapped-types'; // O '@nestjs/swagger' si usas Swagger
import { CreateGroupDto } from './create-group.dto';
import { IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {

    // 🌟 Añadimos las propiedades del payload que no existen en "CreateGroup"
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
}