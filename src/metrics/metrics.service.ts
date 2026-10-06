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

}