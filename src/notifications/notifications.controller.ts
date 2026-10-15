import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { GetNotificationsFilterDto } from './dto/get-notifications-filter.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }
    @Get()
    async findAll(
        @CurrentUser() user: any,
        @Query() params: GetNotificationsFilterDto,
    ) {
        const userId = user?.sub;
        return this.notificationsService.findAll(userId, params);
    }
}