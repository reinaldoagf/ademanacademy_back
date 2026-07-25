import { Controller, Get, Put, Patch, Body, Param, UsePipes, UseGuards, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { UpdateManySettingsDto } from './dto/update-many-settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de ajustes
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    /**
     * Obtiene un ajuste por su clave única ('key')
     * GET /settings/:key
     */
    @Get(':key')
    @HttpCode(HttpStatus.OK)
    async getByKey(@Param('key') key: string) {
        return await this.settingsService.getByKey(key);
    }

    /**
     * Actualiza o crea un ajuste individual
     * PATCH /settings/:key
     */
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateSettiingDto: UpdateSettingDto) {
        return this.settingsService.update(id, updateSettiingDto);
    }

    /**
     * Actualiza o crea múltiples ajustes a la vez (por ejemplo, desde un formulario completo)
     * PUT /settings
     */
    @Put()
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    async updateMany(@Body() updateManySettingsDto: UpdateManySettingsDto) {
        return await this.settingsService.updateManyKeys(updateManySettingsDto.settings);
    }
}