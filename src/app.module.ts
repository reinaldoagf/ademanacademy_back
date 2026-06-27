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
import { InstructorsModule } from './instructors/instructors.module';
import { RegistrationsModule } from './registrations/registrations.module';

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
    InstructorsModule,
    RegistrationsModule
  ],
})
export class AppModule { }