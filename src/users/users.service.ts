// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    // 💡 SOLUCIÓN AL ERROR TS2551: Inyectamos el repositorio de Roles
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // 1. Separamos los roles (strings) de los datos del usuario
  const { roles: rolesInput, ...userData } = createUserDto;

  // 2. Creamos la instancia del usuario solo con sus campos nativos
  const nuevoUsuario = this.usersRepository.create(userData);

  // 3. Buscamos las entidades de roles reales en la base de datos por su columna 'name'
  if (rolesInput && rolesInput.length > 0) {
    const rolesEntities = await this.rolesRepository.find({
      where: rolesInput.map((roleName) => ({
        name: roleName as 'admin' | 'organizer' | 'client',
      })),
    });

    // 💡 IMPORTANTE: Si la tabla de roles está vacía inicialmente, las buscamos o las instanciamos
    if (rolesEntities.length === 0) {
      // Fallback de emergencia si los roles no han sido previamente sembrados (seeded) en la bdd
      const fallbackRoles = await this.rolesRepository.save(
        rolesInput.map((name) => this.rolesRepository.create({ name: name as any }))
      );
      nuevoUsuario.roles = fallbackRoles;
    } else {
      nuevoUsuario.roles = rolesEntities; // Asignamos las entidades reales encontradas
    }
  }

  // 4. Guardamos el usuario con su relación forzada. 
  // TypeORM insertará automáticamente los registros en la tabla intermedia 'users_roles'
  return await this.usersRepository.save(nuevoUsuario);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOneBy({ email });
  }

  async findAll(): Promise<User[]> {
    // Retorna todos los usuarios omitiendo el campo password por seguridad en las respuestas globales
    return await this.usersRepository.find({
      // 1. Seleccionamos solo las columnas primitivas de la tabla 'users'
      select: ['id', 'name', 'email', 'createdAt'], 
      // 2. Cargamos la relación de la tabla intermedia con 'relations'
      relations: ['roles'], 
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
  const user = await this.usersRepository.findOne({ where: { id }, relations: ['roles'] });
  if (!user) throw new NotFoundException('Usuario no encontrado');

  // 2. Separamos los roles del resto de datos primitivos del DTO
  const { roles: rolesInput, ...datosAActualizar } = updateUserDto;

  // 3. Mezclamos primero los datos planos (name, email, etc.)
  this.usersRepository.merge(user, datosAActualizar);

  // 4. Si el usuario envió nuevos roles, buscamos sus entidades reales y las asignamos
  if (rolesInput && rolesInput.length > 0) {
    const rolesEntities = await this.rolesRepository.find({
      where: rolesInput.map((roleName) => ({ 
        name: roleName as 'admin' | 'organizer' | 'client' 
      })),
    });
    user.roles = rolesEntities;
  }

  // 5. Guardamos los cambios de forma segura
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