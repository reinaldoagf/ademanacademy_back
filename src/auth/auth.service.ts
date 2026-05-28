// src/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async signup(registerDto: SignupDto) {
    // 1. Validar si el email ya existe
    const userExists = await this.usersService.findByEmail(registerDto.email);
    if (userExists) {
      throw new BadRequestException('El correo electrónico ya está registrado');
    }

    // 2. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    // 3. 🧠 LÓGICA DE NEGOCIO: Verificar si es el primer usuario del sistema
    const totalUsers = await this.usersService.countAll(); // Necesitas crear este método en UsersService

    // 4. Enviar al UsersService incluyendo el rol calculado internamente
    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      isAdmin: totalUsers === 0, // 👈 Pasado de forma segura en el servidor
    });


    if (user && user.password) delete user.password;

    return user;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Buscar usuario
    const user = await this.usersService.findByEmail(email);
    console.log({ user })
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
      isAdmin: user.isAdmin,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    };
  }
}
