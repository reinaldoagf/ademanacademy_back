import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
    constructor(private readonly prisma: PrismaService) { }

    // 🔍 READ ALL (Con paginación y filtro por nombre del salón o tipo)
    async getBorrowedCostumes() {
        try {
            // 3. Conteo de Vestuarios Prestados
            // Ajusta según la tabla/relación de inventario/vestuario prestado
            const borrowedCostumes = await this.prisma.studentCostume.count({
                where: {
                    status: 'assigned'
                },
            }).catch(() => 0);
            return {
                data: {
                    borrowedCostumes,
                },
            };
        } catch (error) {
            console.error('Error al obtener métricas del Dashboard:', error);
            return {
                data: {
                    borrowedCostumes: 0,
                },
            };
        }
    }
    async getActivePreInscriptions() {
        try {
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
            return {
                data: {
                    activePreInscriptions,
                },
            };
        } catch (error) {
            console.error('Error al obtener métricas del Dashboard:', error);
            return {
                data: {
                    activePreInscriptions: 0,
                },
            };
        }
    }

    async getRevenueByCategoryMetrics() {
        try {
            const incomeAggregations = await this.prisma.transaction.groupBy({
                by: ['concept'],
                where: {
                    status: 'approved', // O 'approved' / 'paid' según tu TransactionStatus
                },
                _sum: {
                    amount: true,
                },
            }); // Mapear resultados agregados
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
            return {
                data: {
                    lockerRoom,
                    storeSales,
                    tuition,
                    monthlyPayments,
                    customClasses,
                    specialEvents,
                },
            };
        } catch (error) {
            console.error('Error al obtener métricas de ingresos por concepto:', error);
            return {
                data: {
                    lockerRoom: 0,
                    storeSales: 0,
                    tuition: 0,
                    monthlyPayments: 0,
                    customClasses: 0,
                    specialEvents: 0,
                },
            };
        }
    }

    async getBalanceChartMetrics(startDateParam?: string, endDateParam?: string) {
        try {
            const now = new Date();

            // 1. Definir rango de fechas
            const endDate = endDateParam ? new Date(endDateParam) : new Date(now);
            endDate.setHours(23, 59, 59, 999);

            const startDate = startDateParam ? new Date(startDateParam) : new Date(now);
            if (!startDateParam) {
                startDate.setDate(now.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate.setHours(0, 0, 0, 0);
            }

            // 2. INGRESOS: Transacciones aprobadas dentro del rango
            const incomeTransactions = await this.prisma.transaction.findMany({
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

            // 3. EGRESOS: Pagos/Abonos realizados a Cuentas por Pagar (CxP) dentro del rango
            const expensePayments = await this.prisma.payablePayment.findMany({
                where: {
                    paymentDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                select: {
                    amount: true,
                    paymentDate: true,
                },
            });

            // 4. Mapeo dinámico y llenado de días en el rango seleccionado
            const periodsMap = new Map<string, { label: string; ingresos: number; egresos: number }>();

            const cursor = new Date(startDate);
            while (cursor <= endDate) {
                const year = cursor.getFullYear();
                const month = String(cursor.getMonth() + 1).padStart(2, "0");
                const day = String(cursor.getDate()).padStart(2, "0");
                const dayKey = `${year}-${month}-${day}`;

                const label = cursor.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                });

                if (!periodsMap.has(dayKey)) {
                    periodsMap.set(dayKey, { label, ingresos: 0, egresos: 0 });
                }

                cursor.setDate(cursor.getDate() + 1);
            }

            // Helper para extraer la clave YYYY-MM-DD
            const getDayKey = (date: Date) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                return `${y}-${m}-${d}`;
            };

            // 5. Acumular INGRESOS por día
            incomeTransactions.forEach((tx) => {
                const txKey = getDayKey(new Date(tx.createdAt));
                if (periodsMap.has(txKey)) {
                    periodsMap.get(txKey)!.ingresos += Number(tx.amount || 0);
                }
            });

            // 6. Acumular EGRESOS por día
            expensePayments.forEach((payment) => {
                const paymentKey = getDayKey(new Date(payment.paymentDate));
                if (periodsMap.has(paymentKey)) {
                    periodsMap.get(paymentKey)!.egresos += Number(payment.amount || 0);
                }
            });

            const periods = Array.from(periodsMap.values());

            // 7. Retorno de la estructura adaptada
            return {
                success: true,
                data: {
                    labels: periods.map((p) => p.label),
                    ingresosData: periods.map((p) => Math.round(p.ingresos * 100) / 100),
                    egresosData: periods.map((p) => Math.round(p.egresos * 100) / 100),
                },
                meta: {
                    startDate: startDate.toISOString().split("T")[0],
                    endDate: endDate.toISOString().split("T")[0],
                },
            };
        } catch (error) {
            console.error("Error al obtener métricas del gráfico de ingresos vs egresos:", error);
            return {
                success: false,
                error: "No se pudieron calcular las métricas de ingresos vs egresos.",
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

    async getCostumeInventoryMetrics() {
        try {
            // Consultar asignaciones de vestuarios junto con el estudiante y su cliente (representante/alumno)
            const assignments = await this.prisma.studentCostume.findMany({
                take: 10,
                orderBy: { createdAt: "desc" },
                include: {
                    costume: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            status: true,
                        },
                    },
                    student: {
                        include: {
                            clients: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                                take: 1,
                            },
                        },
                    },
                },
            });

            const data = assignments.map((item) => {
                const client = item.student?.clients?.[0];
                const studentName = client
                    ? `${client.firstName} ${client.lastName.charAt(0)}.`
                    : "Sin Asignar";

                // Determinar cuota pendiente en base al precio y estado del vestuario/asignación
                const priceNum = Number(item.costume?.price || 0);
                const isPendingPayment = item.costume?.status === "payment_pending";
                const pendingFee = isPendingPayment ? priceNum : 0;

                return {
                    id: item.id,
                    costumeName: item.costume?.name || "Vestuario",
                    responsible: studentName,
                    status: item.status, // ej: "assigned", "returned", "damaged", etc.
                    costumeStatus: item.costume?.status,
                    pendingFee: pendingFee,
                };
            });

            return {
                success: true,
                data,
            };
        } catch (error) {
            console.error("Error al obtener control de vestuarios:", error);
            return {
                success: false,
                error: "No se pudo obtener el control de vestuarios.",
            };
        }
    }
}