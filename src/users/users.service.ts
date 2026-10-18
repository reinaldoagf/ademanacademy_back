// src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersFilterDto } from './dto/get-users-filter.dto';
import { ClientType, User, Prisma, NotificationChannel, ConceptType, PaymentMethod, TransactionStatus, Kinship, ProfileType } from '@prisma/client'; // 🎯 Importación nativa estándar
import { NotificationsService } from '@/notifications/notifications.service';
import { MailsService } from '@/mails/mails.service';
export type UserWithClients = Prisma.UserGetPayload<{
  include: {
    ownedClients: {
      include: {
        student: true;
      };
    };
  };
}>;
@Injectable()
export class UsersService {
  // 💡 Tipamos como 'any' para evitar que TypeScript se queje por la estructura interna de accesores de Prisma v7
  private readonly prismaClient: any;

  constructor(
    private readonly prisma: PrismaService,
    private mailService: MailsService,
    private notificationsService: NotificationsService,
  ) {

  }

  /**
   * Crea un nuevo usuario en la base de datos
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // 1. Verificamos si ya existe un usuario con el mismo DNI
      const existingUserByDni = await this.prisma.user.findUnique({
        where: { dni: createUserDto.dni },
      });

      if (existingUserByDni) {
        throw new ConflictException(`Ya existe un usuario registrado con el DNI: ${createUserDto.dni}`);
      }

      // 2. Opcional: Verificar por correo electrónico si aplica
      const existingUserByEmail = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingUserByEmail) {
        throw new ConflictException(`El correo electrónico ${createUserDto.email} ya está en uso.`);
      }

      // 2. Opcional: Verificar por correo electrónico si aplica
      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phone: createUserDto.phone },
      });

      if (existingUserByPhone) {
        throw new ConflictException(`El teléfono ${createUserDto.phone} ya está en uso.`);
      }
      return await this.prisma.user.create({
        data: createUserDto,
      });
    } catch (error) {
      // Capturamos errores específicos de Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002 es el código de Prisma para violación de restricción única (Unique constraint failed)
        if (error.code === 'P2002') {
          console.error({ error })
          const target = (error.meta?.target as string[])?.join(', ') || 'campo';
          throw new ConflictException(`Ya existe un registro con el mismo valor para: ${target}.`);
        }
      }

      console.error('Error inesperado al crear el usuario:', error);
      throw new InternalServerErrorException(error || error.message || 'Ocurrió un error al procesar el registro en la base de datos.');
    }
  }
  /**
   * Busca un usuario por su correo electrónico (Utilizado en AuthService)
   */
  async findByEmail(email: string): Promise<UserWithClients | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        ownedClients: {
          include: {
            student: true, // Incluye la información del estudiante si existe la relación
          },
        },
      },
    });
    return user
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
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { dni: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [data, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where })
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
    const user = await this.prisma.user.findUnique({
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

    return await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  /**
   * Elimina un usuario de la base de datos
   */
  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: `Usuario con ID ${id} eliminado correctamente` };
  }

  /**
   * Cuenta el total de usuarios registrados
   */
  async countAll(): Promise<number> {
    return await this.prisma.user.count();
  }

  async completeOnboarding(registeringUserId: string, dto: any, file?: Express.Multer.File) {
    // 1. Validaciones previas de usuario...

    const receiptPath = file ? file.filename : null;
    const user = await this.prisma.user.findUnique({ where: { id: registeringUserId } });

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
          where: { id: registeringUserId },
          data: {
            profileType: dto.profileType,
            profileOnboarding: true,
            occupation: dto.profileType === ProfileType.Representante ? dto.representativeOccupation : undefined,
          },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, profileType: true, profileOnboarding: true, occupation: true },

        });

        // Operación B: Si es REPRESENTATIVE, insertar estudiantes
        if (dto.profileType === ClientType.Representante && dto.representedStudents) {
          const representedStudents = dto.representedStudents.map((representedStudent) => ({
            firstName: representedStudent.firstName,
            lastName: representedStudent.lastName,
            dni: representedStudent.dni || null,
            email: representedStudent.email || null,
            birthDate: new Date(representedStudent.birthDate),
            type: ClientType.Estudiante,
            kinship: representedStudent.kinship,
            userId: registeringUserId,
            address: representedStudent.address,
            countryCode: representedStudent.countryCode || "+58",
            phone: representedStudent.phone || null,
            shirtSize: representedStudent.shirtSize,
            hasExperience: representedStudent.hasExperience,
            activeInscription: representedStudent.activeInscription,
            medicalObservations: representedStudent.medicalObservations || null,
          }));

          for (const representedStudent of representedStudents) {
            if (representedStudent.type == ClientType.Estudiante) {
              const student = await tx.student.create({
                data: {
                  kinship: representedStudent.kinship,
                  shirtSize: representedStudent.shirtSize,
                  hasExperience: representedStudent.hasExperience,
                  medicalObservations: representedStudent.medicalObservations || null,
                }
              });
              await tx.registration.create({
                data: {
                  userId: registeringUserId,
                  studentId: student.id,
                }
              });
              const client = await tx.client.create({
                data: {
                  firstName: representedStudent.firstName,
                  lastName: representedStudent.lastName,
                  dni: representedStudent.dni || null,
                  email: representedStudent.email || null,
                  birthDate: new Date(representedStudent.birthDate),
                  type: ClientType.Estudiante,
                  userId: registeringUserId,
                  studentId: student.id,
                  address: representedStudent.address,
                  countryCode: representedStudent.countryCode || "+58",
                  phone: representedStudent.phone || null,
                }
              });
              // 🎯 Operación D: Flujo e inserción de la información de Pago (Matrícula)
              if (dto.payment && dto.payment.amount / representedStudents.filter(e => !e.activeInscription).length > 0 && !representedStudent.activeInscription) {

                // 2. Crear el registro de la transacción enviada por el usuario
                await tx.transaction.create({
                  data: {
                    registeringUserId: registeringUserId,
                    clientId: client.id,
                    concept: ConceptType.Inscripción,
                    amount: dto.payment.amount / representedStudents.filter(e => !e.activeInscription).length,
                    method: PaymentMethod.Transferencia, // Define un valor por defecto o extiéndelo en tu enum
                    status: TransactionStatus.Pendiente, // Queda 'pending' para auditoría manual del administrador
                    referenceNumber: dto.payment.referenceNumber || null,
                    bankName: dto.payment.bankName || null,
                    receiptPath: receiptPath
                  }
                });



              }
            }
          }

          if (representedStudents.filter(e => e.activeInscription).length > 0) {
            // Crear las inscripciones

            const studentsFullNames = representedStudents.filter(e => e.activeInscription).map(e => `${e.firstName} ${e.lastName}`);

            const adminUsers = await tx.user.findMany({
              where: {
                isAdmin: true,
              }
            });
            for (const adminUser of adminUsers) {
              await this.notificationsService.sendNotification({
                userId: adminUser.id, // Destinatario específico en el App
                recipientPhone: undefined,      // Teléfono para WhatsApp
                title: '¡Pedido Registrado! 🎉',
                message: `Hola, se registró una inscripción de un representante para el(los) alumno(s): ${studentsFullNames.join(', ')}, el/los cual/es se encuentra/n activo/s en la academia. Por favor revise la información y asigne el grupo al/los estudiante(s).`,
                channel: NotificationChannel.Ambos,   // Genera Realtime In-App y envía a WhatsApp
                link: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/admin/students`,
              });
            }


          }
        }
        // Operación C: Si es STUDENT autónomo
        if (dto.profileType === ClientType.Estudiante) {
          const existingClient = await tx.client.findFirst({
            where: {
              dni: user.dni,
              type: ClientType.Estudiante,
            }
          });
          if (!existingClient) {
            const student = await tx.student.create({
              data: {
                kinship: Kinship.Otro,
                shirtSize: 'M',
                hasExperience: false,
                medicalObservations: null,
              }
            });
            const client = await tx.client.create({
              data: {
                firstName: user.firstName,
                lastName: user.lastName,
                dni: user.dni,
                email: user.email,
                birthDate: new Date(),
                userId: registeringUserId,
                studentId: student.id,
                address: '',
                phone: user.phone || null,
                type: ClientType.Estudiante,
              }
            });
            await tx.registration.create({
              data: {
                userId: registeringUserId,
                studentId: student.id,
                clientId: client.id,
              }
            });
            if (dto.payment) {

              await tx.transaction.create({
                data: {
                  registeringUserId: registeringUserId,
                  clientId: client.id,
                  concept: ConceptType.Inscripción,
                  amount: dto.payment.amount,
                  method: PaymentMethod.Transferencia, // Define un valor por defecto o extiéndelo en tu enum
                  status: TransactionStatus.Pendiente, // Queda 'pending' para auditoría manual del administrador
                  referenceNumber: dto.payment.referenceNumber || null,
                  bankName: dto.payment.bankName || null,
                  receiptPath: receiptPath
                }
              });
            }
          } else {
            await tx.client.update({
              where: {
                id: existingClient.id,
              },
              data: {
                userId: registeringUserId,
                firstName: existingClient.firstName || user.firstName,
                lastName: existingClient.lastName || user.lastName,
                dni: existingClient.dni || user.dni,
                email: existingClient.email || user.email,
                phone: existingClient.phone || user.phone,
              }
            })
          }

        }

        return {
          message: 'Onboarding y reporte de pago procesados con éxito.',
          user: await tx.user.findUnique({
            where: { id: registeringUserId },
            include: { ownedClients: true }
          }),
        };

      });
    } catch (error: any) {
      console.error({ error });
      if (error.code === 'P2002') {
        throw new BadRequestException('El DNI de uno de los estudiantes ya se encuentra registrado.');
      }
      throw new InternalServerErrorException('Error en el servidor al procesar el onboarding.');
    }
  }
  async requestAccountLinking(userId: string, email: string) {
    // 1. Buscar cliente huérfano (sin usuario asignado) con ese correo
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        email: email,
      },
      include: { ownedClients: { include: { student: true } } },
    });

    if (!user) {
      throw new BadRequestException('No se encontró un usuario con ese correo electrónico.');
    }

    if (user.ownedClients.length > 1) {
      throw new BadRequestException('El correo electrónico está asociado a múltiples cuentas.');
    }
    // Por seguridad defensiva, evitamos filtrar si el correo existe o no

    // 2. Generar código OTP de 6 dígitos
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    // 3. Guardar temporalmente el OTP en el cliente (puedes usar IDNumberPrefix o un campo de expiración)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otpCode, // Almacenamos el PIN temporalmente,
        otpCodeExpiry: new Date(Date.now() + 10 * 60 * 1000)
      },
    });

    const studentFullName = `${user.firstName} ${user.lastName}`;

    // 4. Enviar Correo Electrónico con el OTP
    await this.mailService.sendOtpEmail(user.email, otpCode, studentFullName);

    // 5. Opcional: Enviar también notificación por WhatsApp si tiene teléfono registrado
    if (user.phone) {
      const fullPhone = `${user.countryCode || ''}${user.phone}`;
      await this.notificationsService.sendNotification({
        recipientPhone: fullPhone,
        title: 'Código de Vinculación',
        message: `Hola ${user.firstName}, tu código de verificación de la academia es: ${otpCode}`,
        channel: NotificationChannel.Whatsapp,
      });
    }

    return {
      success: true,
      message: "Se ha enviado un código de verificación a tu correo electrónico."
    };
  }
  async confirmAccountLinking(userId: string, email: string, otpCode: string) {
    // 1. Validar el cliente con el correo y el código OTP almacenado
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.trim(),
        otpCode: otpCode, // Verificamos el código OTP
      }
    });

    if (!user) {
      throw new BadRequestException('Código inválido o expirado.');
    }

    // 2. ¡VINCULACIÓN SEGURA! Asignamos el userId de la cuenta nueva al cliente preexistente
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpCodeExpiry: null
      }
    });

    return updatedUser;
  }
}