// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // 1. Cargar variables de entorno globalmente
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule, // 💡 REGÍSTRALO AQUÍ para activar su alcance global
    AuthModule,
    UsersModule,
  ],
})
export class AppModule { }