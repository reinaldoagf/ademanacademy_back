import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupCategoryDto } from './create-group-category.dto';

export class UpdateGroupCategoryDto extends PartialType(CreateGroupCategoryDto) { }