import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
    constructor(private readonly prisma: PrismaService) { }

    // 🔍 READ ALL (Con paginación y filtro por nombre del salón o tipo)
    async getAdminDashboardMetrics() {
        try {
            // 1. Agrupar ingresos de transacciones aprobadas por concepto
            // NOTA: Ajusta los valores ('MONTHLY_PAYMENT', 'CUSTOM_CLASS', 'EVENT_TICKET') 
            // a los valores exactos de tu enum ConceptType en Prisma.
            const incomeAggregations = await this.prisma.transaction.groupBy({
                by: ['concept'],
                where: {
                    status: 'approved', // O 'approved' / 'paid' según tu TransactionStatus
                },
                _sum: {
                    amount: true,
                },
            });

            // Mapear resultados agregados
            let lockerRoom = 0;
            let tuition = 0;
            let monthlyPayments = 0;
            let customClasses = 0;
            let specialEvents = 0;
            let storeSales = 0;

            incomeAggregations.forEach((item) => {
                const amount = Number(item._sum.amount ?? 0);
                switch (item.concept) {
                    case 'locker_room':
                        lockerRoom += amount;
                        break;
                    case 'product':
                        storeSales += amount;
                        break;
                    case 'tuition':
                        tuition += amount;
                        break;
                    case 'monthly_payment':
                        monthlyPayments += amount;
                        break;
                    case 'class':
                        customClasses += amount;
                        break;
                    case 'ticket':
                        specialEvents += amount;
                        break;
                    default:
                        break;
                }
            });

            // 2. Conteo de Preinscripciones Activas
            // Ajusta la tabla/filtro según el modelo donde guardes las preinscripciones/alumnos
            const activePreInscriptions = await this.prisma.student.count({
                where: {
                    registrations: {
                        some: {
                            status: 'pre_registered'
                        }
                    }
                },
            }).catch(() => 0); // Manejo defensivo por si el modelo difiere

            // 3. Conteo de Vestuarios Prestados
            // Ajusta según la tabla/relación de inventario/vestuario prestado
            const borrowedCostumes = await this.prisma.studentCostume.count({
                where: {
                    status: 'assigned'
                },
            }).catch(() => 0);
            return {
                data: {
                    incomeByConcept: {
                        lockerRoom,
                        storeSales,
                        tuition,
                        monthlyPayments,
                        customClasses,
                        specialEvents,
                    },
                    activePreInscriptions,
                    borrowedCostumes,
                },
            };
        } catch (error) {
            console.error('Error al obtener métricas del Dashboard:', error);
            return {
                incomeByConcept: {
                    monthlyPayments: 0,
                    customClasses: 0,
                    specialEvents: 0,
                },
                activePreInscriptions: 0,
                borrowedCostumes: 0,
            };
        }
    }

    async getBalanceChartMetrics(year?: number, month?: number) {
        try {
            const now = new Date();
            const selectedYear = year ?? now.getFullYear();
            // Nota: JS usa meses 0-11. Asumimos month de 1 a 12 o por defecto el mes actual
            const selectedMonth = month ? month - 1 : now.getMonth();

            const startDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0);
            const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

            const monthName = startDate.toLocaleString("es-ES", {
                month: "long",
                year: "numeric",
            });

            // 1. Obtener Transacciones aprobadas en el rango del mes (Recaudado)
            const transactions = await this.prisma.transaction.findMany({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    // Ajusta la condición de transacción completada según tus enums
                    status: "approved", // O 'approved' / 'paid'
                },
                select: {
                    amount: true,
                    createdAt: true,
                },
            });

            // 2. Obtener Cuentas por Cobrar (PaymentOrders pendientes)
            const pendingOrders = await this.prisma.paymentOrder.findMany({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: "pending",
                },
                select: {
                    amount: true,
                    createdAt: true,
                },
            });

            // Inicializar acumuladores por semanas (Semana 1 a Semana 4)
            const weeks = [
                { label: "Semana 1", recaudado: 0, cuentasPorCobrar: 0 },
                { label: "Semana 2", recaudado: 0, cuentasPorCobrar: 0 },
                { label: "Semana 3", recaudado: 0, cuentasPorCobrar: 0 },
                { label: "Semana 4", recaudado: 0, cuentasPorCobrar: 0 },
            ];

            // Helper para determinar a qué semana pertenece el día del mes
            const getWeekIndex = (date: Date) => {
                const day = date.getDate();
                if (day <= 7) return 0;
                if (day <= 14) return 1;
                if (day <= 21) return 2;
                return 3; // Del día 22 en adelante
            };

            // Sumar Recaudado
            transactions.forEach((tx) => {
                const weekIdx = getWeekIndex(tx.createdAt);
                weeks[weekIdx].recaudado += Number(tx.amount || 0);
            });

            // Sumar Cuentas por Cobrar
            pendingOrders.forEach((order) => {
                const weekIdx = getWeekIndex(order.createdAt);
                weeks[weekIdx].cuentasPorCobrar += Number(order.amount || 0);
            });

            return {
                success: true,
                data: {
                    monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                    labels: weeks.map((w) => w.label),
                    recaudadoData: weeks.map((w) => Math.round(w.recaudado * 100) / 100),
                    cuentasPorCobrarData: weeks.map((w) => Math.round(w.cuentasPorCobrar * 100) / 100),
                },
            };
        } catch (error) {
            console.error("Error al obtener métricas del gráfico de balance:", error);
            return {
                success: false,
                error: "No se pudieron calcular las métricas de balance.",
            };
        }
    }
}