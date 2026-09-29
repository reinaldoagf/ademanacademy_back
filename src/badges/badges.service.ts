import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BadgesService {
    constructor(private readonly prisma: PrismaService) { }

    async getBadgesSummary(userId: string): Promise<Record<string, number>> {
        const [
            clientsCount,
            studentsCount,
            classroomsCount,
            usersCount,
            ordersCount,
            paymentOrdersCount,
            transactionsCount,
            employeesCount,
            productsCount,
            groupCategoriesCount,
            uniformsCount,
            costumesCount,
            seatingChartsCount,
            eventsCount,
            myPaymentsCount,
            myPaymentOrdersCount
        ] = await Promise.all([
            this.prisma.client.count(),
            this.prisma.student.count(),
            this.prisma.classroom.count(),
            this.prisma.user.count(),
            this.prisma.order.count(),
            this.prisma.paymentOrder.count(),
            this.prisma.transaction.count(),
            this.prisma.employee.count(),
            this.prisma.product.count(),
            this.prisma.groupCategory.count(),
            this.prisma.uniform.count(),
            this.prisma.costume.count(),
            this.prisma.seatingMap.count(),
            this.prisma.event.count(),
            this.prisma.transaction.count({ where: { client: { userId: userId } } }),
            this.prisma.paymentOrder.count({ where: { client: { userId: userId } } }),
        ]);

        return {
            clients: clientsCount,
            students: studentsCount,
            classrooms: classroomsCount,
            groupsCategories: groupCategoriesCount,
            users: usersCount,
            orders: ordersCount,
            paymentOrders: paymentOrdersCount,
            payments: transactionsCount,
            employees: employeesCount,
            wardrobeUniforms: uniformsCount,
            wardrobeCostumes: costumesCount,
            storeProducts: productsCount,
            seatingCharts: seatingChartsCount,
            events: eventsCount,
            myPayments: myPaymentsCount,
            myPaymentOrders: myPaymentOrdersCount,
        };
    }
}