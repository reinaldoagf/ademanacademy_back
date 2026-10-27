import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Controller('metrics')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) { }
    @Get('contract-data')
    async getContractData(@CurrentUser() user: any) {
        return this.metricsService.getContractData({ ...user, id: user.sub });
    }
    @Get('revenue-by-category')
    async getRevenueByCategoryMetrics() {
        return this.metricsService.getRevenueByCategoryMetrics();
    }
    @Get('active-pre-inscriptions')
    async getActivePreInscriptions() {
        return this.metricsService.getActivePreInscriptions();
    }
    @Get('borrowed-costumes')
    async getBorrowedCostumes() {
        return this.metricsService.getBorrowedCostumes();
    }

    @Get('balance-chart')
    async getBalanceChartMetrics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.metricsService.getBalanceChartMetrics(startDate, endDate);
    }
    @Get('academic-calendar-events')
    async getAcademicCalendarEvents(
        @CurrentUser() user: any,
        @Query('myCalendar') myCalendar?: boolean,
        @Query('yearParam') yearParam?: number,
        @Query('monthParam') monthParam?: number,
    ) {
        return this.metricsService.getAcademicCalendarEvents({ ...user, id: user.sub }, myCalendar, yearParam, monthParam);
    }


    @Get('costume-inventory')
    async getCostumeInventoryMetrics() {
        return this.metricsService.getCostumeInventoryMetrics();
    }
}