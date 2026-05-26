import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsArray, IsEnum } from 'class-validator';

export class SignupDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsEmail({}, { message: 'El formato del correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  // 💡 Modificado: Ahora es un arreglo de roles validados por el Enum de la base de datos
  /*  @IsArray({ message: 'Los roles deben enviarse en formato de arreglo []' })
  @IsEnum(['admin', 'organizer', 'client'], {
    each: true, // 👈 Valida que CADA elemento dentro del arreglo pertenezca al Enum
    message: 'Uno o más roles seleccionados no son válidos',
  })
 @IsOptional() // Sigue siendo opcional por si el frontend no envía nada (para aplicar el default)
  roles?: ('admin' | 'organizer' | 'client')[]; */
}