import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es un campo obligatorio' })
  name: string;

  @IsEmail({}, { message: 'El formato del correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es un campo obligatorio' })
  email: string;

  @IsString({ message: 'El número de WhatsApp debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de WhatsApp es obligatorio' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'El formato de WhatsApp no es válido. Debe incluir el código de país (Ej: +584121234567)',
  })
  phone: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;

  @IsString()
  @IsNotEmpty()
  dni: string;
}