// src/uniforms/dto/update-uniform.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUniformDto } from './create-uniform.dto';

export class UpdateUniformDto extends PartialType(CreateUniformDto) { }