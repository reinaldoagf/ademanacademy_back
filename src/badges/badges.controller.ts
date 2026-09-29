import { Controller, Get, UseGuards } from '@nestjs/common';
import { BadgesService } from './badges.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('badges') // Ruta base: /api/badges
export class BadgesController {
    constructor(private readonly badgesService: BadgesService) { }

    @Get('summary') // Subruta: GET /api/badges/summary
    @UseGuards(JwtAuthGuard) // Opcional: Proteger si solo usuarios autenticados deben ver los conteos
    async getSummary(
        @CurrentUser() user: any
    ): Promise<Record<string, number>> {
        const userId = user?.sub;
        return await this.badgesService.getBadgesSummary(userId);
    }
}