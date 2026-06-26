// src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Query, Delete, HttpCode, HttpStatus, UseGuards, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersFilterDto } from './dto/get-users-filter.dto';
// ✨ Importación de efectos secundarios para habilitar los tipos globales de Multer sin romper isolatedModules
import 'multer';

@Controller('users')
@UseGuards(JwtAuthGuard) // 🔒 Protege la ruta y valida el Bearer Token del Header
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() filters: GetUsersFilterDto) {
    return this.usersService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
  @Post('complete-onboarding')
  @UseInterceptors(
    FileInterceptor('receiptFile', {
      storage: diskStorage({
        // 📂 Carpeta donde se guardarán los archivos en la raíz de tu proyecto NestJS
        destination: './uploads/receipts',
        filename: (req, file, callback) => {
          // ✨ Generamos un nombre único: timestamp + caracteres aleatorios + extensión original
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          console.log(`receipt-${uniqueSuffix}${ext}`)
          callback(null, `receipt-${uniqueSuffix}${ext}`);
        },
      }),
      // Opcional: Validar que solo suban imágenes o PDFs
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
          return callback(new BadRequestException('Solo se permiten archivos JPG, PNG o PDF.'), false);
        }
        callback(null, true);
      },
    }),
  )
  async completeOnboarding(
    @CurrentUser() user: any,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = user?.sub;

    const profileType = body.profileType;
    const representativeOccupation = body.representativeOccupation;
    const representedStudents = body.representedStudents ? JSON.parse(body.representedStudents) : undefined;
    const payment = body.payment ? JSON.parse(body.payment) : undefined;

    if (profileType === 'representative') {
      if (!representedStudents || representedStudents.length === 0) {
        throw new BadRequestException('Como representante, debes registrar al menos a un estudiante.');
      }
      if (!file) {
        throw new BadRequestException('Debes adjuntar el comprobante de pago.');
      }
    }

    const completeOnboardingDto = {
      profileType,
      representativeOccupation,
      representedStudents,
      payment,
    };

    // 🚀 Pasamos el objeto "file" completo al servicio
    return this.usersService.completeOnboarding(userId, completeOnboardingDto, file);
  }
}