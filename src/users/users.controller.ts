// src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Query, Delete, HttpCode, HttpStatus, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersFilterDto } from './dto/get-users-filter.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

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
  async completeOnboarding(
    @CurrentUser() user: any,
    @Body() body: CompleteOnboardingDto,
  ) {
    const registeringUserId = user?.sub;
    const { profileType, isEnrolled, studentId, payment, representedStudents, representativeOccupation, imageOfPaymentReceipt } = body

    // 1. Validaciones para Representante
    if (profileType === 'Representante') {
      if (!representedStudents || representedStudents.length === 0) {
        throw new BadRequestException('Como representante, debes registrar al menos a un estudiante.');
      }
      if (representedStudents.filter(e => !e.activeInscription).length > 0 && !imageOfPaymentReceipt) {
        throw new BadRequestException('Debes adjuntar el comprobante de pago.');
      }
    }

    // 2. Validaciones para Estudiante
    if (profileType === 'student') {
      // Si NO está inscrito previamente, exigimos el comprobante de pago
      if (!isEnrolled && !imageOfPaymentReceipt) {
        throw new BadRequestException('Debes adjuntar el comprobante de pago.');
      }
      // Si está inscrito, validamos que venga el studentId
      if (isEnrolled && !studentId) {
        throw new BadRequestException('No se ha especificado el ID del estudiante a vincular.');
      }
    }

    const completeOnboardingDto = {
      profileType,
      representativeOccupation,
      representedStudents,
      payment,
      isEnrolled,
      studentId,
      imageOfPaymentReceipt
    };
    // 🚀 Pasamos el DTO actualizado junto al archivo al servicio
    return this.usersService.completeOnboarding(registeringUserId, completeOnboardingDto);
  }
  @Post('request-account-linking')
  async requestAccountLinking(
    @CurrentUser() user: any,
    @Body() body: { email: string }
  ) {
    const { email } = body;
    return this.usersService.requestAccountLinking(user.sub, email);
  }
  @Post('confirm-account-linking')
  async confirmAccountLinking(
    @CurrentUser() user: any,
    @Body() body: { email: string, otpCode: string }
  ) {
    const { email, otpCode } = body;
    return this.usersService.confirmAccountLinking(user.sub, email, otpCode);
  }
}