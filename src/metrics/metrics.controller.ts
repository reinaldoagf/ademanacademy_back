import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('metrics')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) { }

    @Get('admin-dashboard')
    async getAdminDashboardMetrics() {
        return this.metricsService.getAdminDashboardMetrics();
    }

    @Get('balance-chart')
    async getBalanceChartMetrics(
        @Query('year') year?: number,
        @Query('month') month?: number
    ) {
        return this.metricsService.getBalanceChartMetrics(year, month);
    }
}