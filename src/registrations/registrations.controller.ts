import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RegistrationsService } from './registrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetRegistrationsFilterDto } from './dto/get-registrations-filter.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Controller('registrations')
export class RegistrationsController {
    constructor(private readonly registrationsService: RegistrationsService) { }
    @Get()
    @UseGuards(JwtAuthGuard) // 🔒 Protege la ruta y valida el Bearer Token del Header
    findAll(@Query() filters: GetRegistrationsFilterDto) {
        return this.registrationsService.findAll(filters);
    }
    @Post()
    @UseGuards(JwtAuthGuard) // 🔒 Protege la ruta y valida el Bearer Token del Header
    async completeOnboarding(
        @CurrentUser() user: any,
        @Body() createRegistrationDto: CreateRegistrationDto,
    ) {
        const registeringUserId = user.sub;
        return this.registrationsService.create(registeringUserId, createRegistrationDto);
    }
    /* TODO: borrar en produccion */
    @Get('run-cron')
    async testCron() {
        // Forzamos la ejecución manual del método
        await this.registrationsService.handleMonthlyRenewals();
        return { success: true, message: 'Cron job ejecutado manualmente para pruebas.' };
    }
}