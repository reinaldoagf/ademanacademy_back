// src/costumes/dto/update-costume.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCostumeDto } from './create-costume.dto';

export class UpdateCostumeDto extends PartialType(CreateCostumeDto) { }