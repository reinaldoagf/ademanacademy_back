import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es un campo obligatorio' })
  name: string;

  @IsEmail({}, { message: 'El formato del correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es un campo obligatorio' })
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  // 💡 Modificado: Ahora acepta un arreglo de roles validados individualmente por el Enum
  @IsArray({ message: 'Los roles deben estructurarse en un arreglo []' })
  @IsEnum(['admin', 'organizer', 'client'], {
    each: true, // Valida uno a uno los elementos internos del array
    message: 'Uno o más roles del listado no son válidos',
  })
  @IsOptional() // Permite omitirlo para que el servicio aplique el rol por defecto en cascada
  roles?: ('admin' | 'organizer' | 'client')[];
}