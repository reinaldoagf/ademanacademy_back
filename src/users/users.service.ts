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
    private readonly usersRepository: Repository<User>
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { ...userData } = createUserDto;

    // 2. Creamos la instancia del usuario solo con sus campos nativos
    const newUser = this.usersRepository.create(userData);

    // 3. Guardamos el usuario con su relación forzada. 
    return await this.usersRepository.save(newUser);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { email }
    });
  }

  async findAll(): Promise<User[]> {
    // Retorna todos los usuarios omitiendo el campo password por seguridad en las respuestas globales
    return await this.usersRepository.find({
      // 1. Seleccionamos solo las columnas primitivas de la tabla 'users'
      select: ['id', 'name', 'email', 'createdAt'],
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
    // 1. Buscamos el usuario existente
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const { ...data } = updateUserDto;

    // 2. Mezclamos primero los datos planos (name, email, etc.)
    this.usersRepository.merge(user, data);



    // 4. Guardamos los cambios de forma segura
    return await this.usersRepository.save(user);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findOne(id); // Valida primero si existe
    await this.usersRepository.remove(user);
    return { message: `Usuario con ID ${id} eliminado correctamente` };
  }

  async countAll(): Promise<number> {
    return await this.usersRepository.count();
  }
}