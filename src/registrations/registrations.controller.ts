import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetRegistrationsFilterDto } from './dto/get-registrations-filter.dto';

@Controller('registrations')
@UseGuards(JwtAuthGuard) // 🔒 Protege la ruta y valida el Bearer Token del Header
export class RegistrationsController {
    constructor(private readonly registrationsService: RegistrationsService) { }
    @Get()
    findAll(@Query() filters: GetRegistrationsFilterDto) {
        return this.registrationsService.findAll(filters);
    }

}