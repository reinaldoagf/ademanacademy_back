import { PartialType } from '@nestjs/mapped-types';
import { CreateSeatingMapDto } from './create-seating-map.dto';

export class UpdateSeatingMapDto extends PartialType(CreateSeatingMapDto) { }