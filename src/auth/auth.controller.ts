// src/auth/auth.controller.ts
import { Controller, Post, Body, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as express from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto, 
    @Res({ passthrough: true }) response: express.Response
  ) {
    const { access_token, user } = await this.authService.login(loginDto);

    // Adjuntar el token como cookie HttpOnly para máxima seguridad contra XSS
    response.cookie('auth_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Solo viaja por HTTPS en producción
      sameSite: 'lax',              // Previene ataques CSRF estándar
      maxAge: 24 * 60 * 60 * 1000,   // Duración de 1 día
      path: '/',                    // Disponible globalmente en el dominio
    });

    return {
      message: 'Sesión iniciada correctamente',
      user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: express.Response) {
    // Para destruir la sesión, forzamos la expiración de la cookie borrando su valor
    response.clearCookie('auth_token', { path: '/' });
    return { message: 'Sesión cerrada exitosamente' };
  }
}