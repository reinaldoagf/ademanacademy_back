import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RegistrationsService } from './registrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetRegistrationsFilterDto } from './dto/get-registrations-filter.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Controller('registrations')
@UseGuards(JwtAuthGuard) // 🔒 Protege la ruta y valida el Bearer Token del Header
export class RegistrationsController {
    constructor(private readonly registrationsService: RegistrationsService) { }
    @Get()
    findAll(@Query() filters: GetRegistrationsFilterDto) {
        return this.registrationsService.findAll(filters);
    }
    @Post()
    async completeOnboarding(
        @CurrentUser() user: any,
        @Body() createRegistrationDto: CreateRegistrationDto,
    ) {
        const registeringUserId = user.sub;
        return this.registrationsService.create(registeringUserId, createRegistrationDto);
    }
}