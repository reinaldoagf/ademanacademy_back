// src/users/users.service.ts
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client'; // 🎯 Importación nativa estándar

@Injectable()
export class UsersService {
  // 💡 Tipamos como 'any' para evitar que TypeScript se queje por la estructura interna de accesores de Prisma v7
  private readonly prismaClient: any;

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService
  ) {
    /**
     * 💡 ARQUITECTURA PRISMA v7:
     * Con adaptadores de MariaDB/MySQL, los modelos no se montan directo en la raíz de la instancia del servicio.
     * Accedemos a ellos usando el diccionario de propiedades del prototipo de Prisma de forma 100% segura.
     */
    this.prismaClient = this.prismaService['user'] || this.prismaService['User'];

    if (!this.prismaClient) {
      // Salvavidas dinámico por si se requiere acceder en cascada
      this.prismaClient = (this.prismaService as any)._client?.['user'] || this.prismaService;
    }
  }

  /**
   * Crea un nuevo usuario en la base de datos
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    return await this.prismaClient.create({
      data: createUserDto,
    });
  }

  /**
   * Busca un usuario por su correo electrónico (Utilizado en AuthService)
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.prismaClient.findUnique({
      where: { email },
    });
  }

  /**
   * Retorna todos los usuarios omitiendo campos sensibles
   */
  async findAll(): Promise<Omit<User, 'password' | 'updatedAt' | 'isAdmin'>[]> {
    return await this.prismaClient.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
  }

  /**
   * Busca un usuario por su ID único. Lanza 404 si no existe.
   */
  async findOne(id: string): Promise<User> {
    const user = await this.prismaClient.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  /**
   * Actualiza los datos de un usuario
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Validamos primero la existencia del registro
    await this.findOne(id);

    return await this.prismaClient.update({
      where: { id },
      data: updateUserDto,
    });
  }

  /**
   * Elimina un usuario de la base de datos
   */
  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    await this.prismaClient.delete({
      where: { id },
    });

    return { message: `Usuario con ID ${id} eliminado correctamente` };
  }

  /**
   * Cuenta el total de usuarios registrados
   */
  async countAll(): Promise<number> {
    return await this.prismaClient.count();
  }
}