// src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Query, Delete, HttpCode, HttpStatus, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersFilterDto } from './dto/get-users-filter.dto';
import { CompleteOnboardingDto, ProfileType } from './dto/complete-onboarding.dto';

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
    @CurrentUser() user: any, // 👈 El decorador extrae el user automáticamente
    @Body() completeOnboardingDto: CompleteOnboardingDto,
  ) {
    // Extraemos el id de forma 100% segura y limpia
    const userId = user?.sub;
    // Regla de negocio en controlador: Validación de payload condicional
    if (
      completeOnboardingDto.profileType === ProfileType.REPRESENTATIVE &&
      (!completeOnboardingDto.representedStudents || completeOnboardingDto.representedStudents.length === 0)
    ) {
      throw new BadRequestException('Como representante, debes registrar al menos a un estudiante.');
    }

    return this.usersService.completeOnboarding(userId, completeOnboardingDto);
  }
}