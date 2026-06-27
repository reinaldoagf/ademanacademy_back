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

  async completeOnboarding(userId: string, dto: any, file?: Express.Multer.File) {
    // 1. Validaciones previas de usuario...

    const receiptPath = file ? file.filename : null;
    const user = await this.prismaClient.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    if (user.profileOnboarding) {
      throw new BadRequestException('El proceso de onboarding ya fue completado para esta cuenta.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {

        // Operación A: Actualizar estatus del usuario
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            profileType: dto.profileType,
            profileOnboarding: true,
            occupation: dto.profileType === 'representative' ? dto.representativeOccupation : undefined,
          },
          select: { id: true, name: true, email: true, phone: true, profileType: true, profileOnboarding: true, occupation: true }
        });

        // Operación B: Si es REPRESENTATIVE, insertar estudiantes
        if (dto.profileType === 'representative' && dto.representedStudents) {
          const studentsData = dto.representedStudents.map((student) => ({
            firstName: student.firstName,
            lastName: student.lastName,
            dni: student.dni || null,
            birthDate: new Date(student.birthDate),
            kinship: student.kinship,
            userId: userId,
            address: student.address,
            phone: student.phone || null,
            shirtSize: student.shirtSize,
            hasExperience: student.hasExperience,
            medicalObservations: student.medicalObservations || null,
          }));

          for (const element of studentsData) {
            const student = await tx.student.create({
              data: element
            });

            // 🎯 Operación D: Flujo e inserción de la información de Pago (Matrícula)
            if (dto.payment) {

              // 2. Crear el registro de la transacción enviada por el usuario
              await tx.transaction.create({
                data: {
                  userId: userId,
                  studentId: student.id,
                  concept: 'tuition',
                  amount: dto.payment.amount / studentsData.length,
                  method: 'bank_transfer', // Define un valor por defecto o extiéndelo en tu enum
                  status: 'pending', // Queda 'pending' para auditoría manual del administrador
                  referenceNumber: dto.payment.reference || null,
                  bankName: dto.payment.bankName || null,
                  receiptPath: receiptPath
                }
              });

              await tx.registration.create({
                data: {
                  userId: userId,
                  studentId: student.id,
                }
              });

            }


          }

          // Operación C: Si es STUDENT autónomo
          if (dto.profileType === 'student') {
            const nameParts = user.name.split(' ');
            const firstName = nameParts[0] || 'Por definir';
            const lastName = nameParts.slice(1).join(' ') || 'Por definir';

            const newStudent = await tx.student.create({
              data: {
                firstName,
                lastName,
                dni: user.dni,
                birthDate: new Date(),
                kinship: 'other',
                userId: userId,
                address: 'Dirección por definir',
                phone: user.phone || null,
                shirtSize: 'M',
                hasExperience: false,
                medicalObservations: null,
              }
            });
            if (dto.payment) {

              await tx.transaction.create({
                data: {
                  userId: userId,
                  studentId: newStudent.id,
                  concept: 'tuition',
                  amount: dto.payment.amount,
                  method: 'bank_transfer', // Define un valor por defecto o extiéndelo en tu enum
                  status: 'pending', // Queda 'pending' para auditoría manual del administrador
                  referenceNumber: dto.payment.reference || null,
                  bankName: dto.payment.bankName || null,
                  receiptPath: receiptPath
                }
              });
            }

          }

          return {
            message: 'Onboarding y reporte de pago procesados con éxito.',
            user: updatedUser,
          };
        }
      });
    } catch (error: any) {
      console.error({ error });
      if (error.code === 'P2002') {
        throw new BadRequestException('El DNI de uno de los estudiantes ya se encuentra registrado.');
      }
      throw new InternalServerErrorException('Error en el servidor al procesar el onboarding.');
    }
  }
}