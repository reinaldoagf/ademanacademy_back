// src/auth/auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    console.log({registerDto})
    // 1. Verificar duplicados en MySQL
    const userExists = await this.usersService.findByEmail(registerDto.email);
    if (userExists) {
      throw new BadRequestException('El correo electrónico ya está registrado');
    }

    // 2. Encriptar contraseña de forma segura (Sal de 10 rondas)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password || '', salt);

    // 3. Guardar en Base de Datos
    const user = await this.usersService.create({
      ...registerDto,
      role: (registerDto.role && registerDto.role.trim() !== '') ? registerDto.role : 'cliente',
      password: hashedPassword,
    });

    // Ocultamos la contraseña antes de retornar el objeto creado
    delete user.password;
    return user;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Buscar usuario
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 2. Verificar password
    const passwordMatches = await bcrypt.compare(password || '', user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 3. Estructurar la información contenida en el token (Payload)
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}