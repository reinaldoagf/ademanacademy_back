import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta a tu PrismaService
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting } from '@prisma/client';

@Injectable()
export class SettingsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtiene un ajuste por su 'key'.
     */
    async getByKey(key: string): Promise<Setting> {
        const setting = await this.prisma.setting.findUnique({
            where: { key },
        });

        if (!setting) {
            throw new NotFoundException(`No se encontró el ajuste con la clave '${key}'.`);
        }

        return setting;
    }

    /**
     * Actualiza o crea un ajuste individual según su 'key'.
     */
    async update(id: string, updateSettingDto: UpdateSettingDto) {
        return await this.prisma.setting.upsert({
            where: { id },
            update: updateSettingDto,
            create: updateSettingDto,
        });
    }

    /**
     * Actualiza o crea múltiples ajustes a la vez.
     */
    async updateManyKeys(
        settings: { key: string; value: string; active?: boolean }[],
    ): Promise<Setting[]> {
        const operations = settings.map((item) =>
            this.prisma.setting.upsert({
                where: { key: item.key },
                update: {
                    value: item.value,
                    ...(item.active !== undefined && { active: item.active }),
                },
                create: {
                    key: item.key,
                    value: item.value,
                    active: item.active ?? true,
                },
            }),
        );

        return await this.prisma.$transaction(operations);
    }
}