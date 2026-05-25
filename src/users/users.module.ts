// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // Inyecta el repositorio nativo de TypeORM para la entidad User
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 👈 Crucial para que AuthModule pueda buscar usuarios por email
})
export class UsersModule {}