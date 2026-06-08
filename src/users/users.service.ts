// src/users/users.service.ts
import { Injectable, NotFoundException, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteOnboardingDto, ProfileType } from './dto/complete-onboarding.dto';
import { GetUsersFilterDto } from './dto/get-users-filter.dto';
import { User } from '@prisma/client'; // 🎯 Importación nativa estándar

@Injectable()
export class UsersService {
  // 💡 Tipamos como 'any' para evitar que TypeScript se queje por la estructura interna de accesores de Prisma v7
  private readonly prismaClient: any;

  constructor(
    private readonly prisma: PrismaService,
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

  async findAll(filters: GetUsersFilterDto) {
    const { page = 1, limit = 10, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { dni: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [data, totalItems] = await Promise.all([
      this.prismaClient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          dni: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      }),
      this.prismaClient.count({ where })
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      }
    };
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

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    // 1. Validar que el usuario exista y no haya completado el onboarding previamente
    const user = await this.prismaClient.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    if (user.profileOnboarding) {
      throw new BadRequestException('El proceso de onboarding ya fue completado para esta cuenta.');
    }

    try {
      // 2. Ejecutar transacciones robustas en Prisma
      return await this.prisma.$transaction(async (tx) => {

        // Operación A: Actualizar el estatus del usuario y su rol en la plataforma
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            profileType: dto.profileType, // 'student' | 'representative' Mapeado desde el enum del DTO
            profileOnboarding: true,
            // 🎯 NUEVO: Guardamos la ocupación únicamente si el rol seleccionado es REPRESENTATIVE
            occupation: dto.profileType === ProfileType.REPRESENTATIVE ? dto.representativeOccupation : undefined,
          },
          select: { id: true, name: true, email: true, phone: true, profileType: true, profileOnboarding: true, occupation: true }
        });

        // Operación B: Si es REPRESENTATIVE, insertar la lista de alumnos bajo su tutoría
        if (dto.profileType === ProfileType.REPRESENTATIVE && dto.representedStudents) {

          // Mapeamos los estudiantes adaptando strings a fechas nativas de JS requeridas por Prisma
          const studentsData = dto.representedStudents.map((student) => ({
            firstName: student.firstName,
            lastName: student.lastName,
            dni: student.dni || null, // 🎯 Guardamos nulo si viene vacío para evitar colisiones
            birthDate: new Date(student.birthDate), // 🎯 Formateo nativo DateTime
            kinship: student.kinship,
            userId: userId, // Relación FK al usuario (Representante)

            // 🎯 NUEVOS CAMPOS DEL ALUMNO MAPEADOS AL MODELO DE BASE DE DATOS
            address: student.address,
            phone: student.phone || null,
            shirtSize: student.shirtSize,
            hasExperience: student.hasExperience,
            group: student.group,
            medicalObservations: student.medicalObservations || null,
          }));

          // Creamos todos los registros en lote
          await tx.student.createMany({
            data: studentsData,
          });
        }

        // Operación C: Si es STUDENT autónomo, creamos su registro espejo en la tabla de alumnos
        if (dto.profileType === ProfileType.STUDENT) {
          // Desestructuramos del nombre del usuario para crear su perfil técnico inicial de alumno
          const nameParts = user.name.split(' ');
          const firstName = nameParts[0] || 'Por definir';
          const lastName = nameParts.slice(1).join(' ') || 'Por definir';

          await tx.student.create({
            data: {
              firstName,
              lastName,
              dni: user.dni,
              birthDate: new Date(), // Se asume que completará sus datos biológicos en su configuración de perfil posterior
              kinship: 'other',
              userId: userId, // El estudiante se apunta a sí mismo

              // 🎯 VALORES POR DEFECTO REQUERIDOS para que no rompa la restricción de campos obligatorios en Prisma
              address: 'Dirección por definir',
              phone: user.phone || null,
              shirtSize: 'M',
              hasExperience: false,
              group: 'adulto', // Se asume adulto por defecto en registro directo o se puede dejar configurable
              medicalObservations: null,
            }
          });
        }

        return {
          message: 'Onboarding completado con éxito.',
          user: updatedUser,
        };
      });

    } catch (error: any) {
      console.log({ error })
      // Control de errores de restricción única de Prisma (ej: DNI repetido)
      if (error.code === 'P2002') {
        throw new BadRequestException('El DNI de uno de los estudiantes ya se encuentra registrado en el sistema.');
      }

      throw new InternalServerErrorException('Error en el servidor al procesar el onboarding.');
    }
  }
}