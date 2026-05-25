// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const nuevoUsuario = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(nuevoUsuario);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOneBy({ email });
  }

  async findAll(): Promise<User[]> {
    // Retorna todos los usuarios omitiendo el campo password por seguridad en las respuestas globales
    return await this.usersRepository.find({
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id); // Valida primero si existe
    
    // Fusiona los cambios solicitados sobre el usuario encontrado
    const usuarioEditado = this.usersRepository.merge(user, updateUserDto);
    return await this.usersRepository.save(usuarioEditado);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findOne(id); // Valida primero si existe
    await this.usersRepository.remove(user);
    return { message: `Usuario con ID ${id} eliminado correctamente` };
  }
}