import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateGroupCategoryDto {
    @IsString({ message: 'El nombre debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    name: string;

    @IsInt({ message: 'La edad mínima debe ser un número entero' })
    @Min(0, { message: 'La edad mínima no puede ser menor a 0' })
    minimumAge: number;

    @IsInt({ message: 'La edad máxima debe ser un número entero' })
    @Min(0, { message: 'La edad máxima no puede ser menor a 0' })
    maximumAge: number;
}