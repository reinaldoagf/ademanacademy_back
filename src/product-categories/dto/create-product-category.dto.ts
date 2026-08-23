import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProductCategoryDto {
    @IsString({ message: 'El nombre debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    name: string;
}