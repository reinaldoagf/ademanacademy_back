// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { GroupsModule } from './groups/groups.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { SchedulesModule } from './schedules/schedules.module';
import { PaymentOrdersModule } from './payment-orders/payment-orders.module';
import { CostumesModule } from './costumes/costumes.module';
import { UniformsModule } from './uniforms/uniforms.module';
import { SettingsModule } from './settings/settings.module';
import { GroupCategoriesModule } from './group-categories/group-categories.module';
import { EmployeesModule } from './employees/employees.module';
import { ProductsModule } from './products/products.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { AccountsPayableModule } from './accounts-payable/accounts-payable.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    // 1. Cargar variables de entorno globalmente
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule, // 💡 REGÍSTRALO AQUÍ para activar su alcance global
    AuthModule,
    UsersModule,
    StudentsModule,
    TransactionsModule,
    ClassroomsModule,
    GroupsModule,
    RegistrationsModule,
    SchedulesModule,
    PaymentOrdersModule,
    CostumesModule,
    UniformsModule,
    SettingsModule,
    GroupCategoriesModule,
    EmployeesModule,
    ProductsModule,
    ProductCategoriesModule,
    AccountsPayableModule,
    OrdersModule
  ],
})
export class AppModule { }