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
    // metrics.service.ts

    async getBalanceChartMetrics(startDateParam?: string, endDateParam?: string) {
        try {
            const now = new Date();

            // Fecha Fin por defecto: Hoy a las 23:59:59.999
            const endDate = endDateParam ? new Date(endDateParam) : new Date(now);
            endDate.setHours(23, 59, 59, 999);

            // Fecha Inicio por defecto: Hace 30 días (si no se proporciona parámetro) o la fecha enviada
            const startDate = startDateParam ? new Date(startDateParam) : new Date(now);
            if (!startDateParam) {
                startDate.setDate(now.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate.setHours(0, 0, 0, 0);
            }

            // 1. Transacciones completadas/aprobadas en el rango
            const transactions = await this.prisma.transaction.findMany({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                    status: "approved",
                },
                select: {
                    amount: true,
                    createdAt: true,
                },
            });

            // 2. Órdenes de pago pendientes en el rango
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

            // 3. Agrupación dinámica por DÍAS en el rango seleccionado
            const periodsMap = new Map<string, { label: string; recaudado: number; cuentasPorCobrar: number }>();

            const cursor = new Date(startDate);
            while (cursor <= endDate) {
                // Clave única por día: YYYY-MM-DD
                const year = cursor.getFullYear();
                const month = String(cursor.getMonth() + 1).padStart(2, "0");
                const day = String(cursor.getDate()).padStart(2, "0");
                const dayKey = `${year}-${month}-${day}`;

                // Formato de etiqueta visible (ej. "07 Oct" o "07/10")
                const label = cursor.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                });

                if (!periodsMap.has(dayKey)) {
                    periodsMap.set(dayKey, { label, recaudado: 0, cuentasPorCobrar: 0 });
                }

                // Incrementar cursor 1 día
                cursor.setDate(cursor.getDate() + 1);
            }

            // Helper para extraer clave YYYY-MM-DD de una fecha
            const getDayKey = (date: Date) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                return `${y}-${m}-${d}`;
            };

            // Acumular Recaudado por día
            transactions.forEach((tx) => {
                const txKey = getDayKey(new Date(tx.createdAt));
                if (periodsMap.has(txKey)) {
                    periodsMap.get(txKey)!.recaudado += Number(tx.amount || 0);
                }
            });

            // Acumular Cuentas por Cobrar por día
            pendingOrders.forEach((order) => {
                const orderKey = getDayKey(new Date(order.createdAt));
                if (periodsMap.has(orderKey)) {
                    periodsMap.get(orderKey)!.cuentasPorCobrar += Number(order.amount || 0);
                }
            });

            const periods = Array.from(periodsMap.values());

            return {
                success: true,
                data: {
                    labels: periods.map((p) => p.label),
                    recaudadoData: periods.map((p) => Math.round(p.recaudado * 100) / 100),
                    cuentasPorCobrarData: periods.map((p) => Math.round(p.cuentasPorCobrar * 100) / 100),
                },
                meta: {
                    startDate: startDate.toISOString().split("T")[0],
                    endDate: endDate.toISOString().split("T")[0],
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

    async getAcademicCalendarEvents(yearParam?: number, monthParam?: number) {
        try {
            const now = new Date();
            const year = yearParam ?? now.getFullYear();
            const month = monthParam ?? now.getMonth() + 1; // 1 - 12

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

            // 1. Obtener Eventos Únicos/Especiales en el rango del mes
            const events = await this.prisma.event.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { startDate: { gte: startOfMonth, lte: endOfMonth } },
                        { endDate: { gte: startOfMonth, lte: endOfMonth } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    startDate: true,
                    description: true,
                },
            });

            // 2. Obtener los Grupos con sus Horarios Semanales y Salones
            const groupsWithSchedules = await this.prisma.group.findMany({
                include: {
                    classroom: { select: { name: true } },
                    schedules: true,
                },
            });

            // Mapeo de días de la semana a nombres de la propiedad JSON en WeeklySchedule
            const daysOfWeekMap = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

            const calendarEvents: Array<{
                id: string;
                title: string;
                group: string;
                time: string;
                room: string;
                date: string; // Formato YYYY-MM-DD
                type: 'ensayo' | 'gala' | 'clase-abierta' | 'clase-regular';
            }> = [];

            // A) Transformar Eventos Especiales de Prisma al formato visual
            events.forEach((evt) => {
                const dateStr = evt.startDate.toISOString().split('T')[0];
                calendarEvents.push({
                    id: `evt-${evt.id}`,
                    title: evt.name,
                    group: 'Evento General / Academia',
                    time: evt.startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }),
                    room: 'Sede Principal',
                    date: dateStr,
                    type: evt.type === 'sample' ? 'clase-abierta' : 'gala',
                });
            });

            // B) Proyectar las Clases Recurrentes sobre los días del Mes seleccionado
            const cursor = new Date(startOfMonth);
            while (cursor <= endOfMonth) {
                const dayIndex = cursor.getDay();
                const dayName = daysOfWeekMap[dayIndex];
                const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;

                groupsWithSchedules.forEach((group) => {
                    group.schedules.forEach((weeklySched) => {
                        const rawSchedule = weeklySched.schedule as Record<string, any[]>;
                        const dayBlocks = rawSchedule?.[dayName] || [];

                        dayBlocks.forEach((block: any, idx: number) => {
                            calendarEvents.push({
                                id: `class-${group.id}-${dateStr}-${idx}`,
                                title: block.label || `Clase de ${group.name}`,
                                group: group.name,
                                time: `${block.startTime || ''} - ${block.endTime || ''}`,
                                room: group.classroom?.name || 'Salón General',
                                date: dateStr,
                                type: 'clase-regular',
                            });
                        });
                    });
                });

                cursor.setDate(cursor.getDate() + 1);
            }

            return {
                success: true,
                data: calendarEvents,
            };
        } catch (error) {
            console.error('Error al obtener cronograma académico:', error);
            return { success: false, error: 'Error al consultar el calendario.' };
        }
    }
}