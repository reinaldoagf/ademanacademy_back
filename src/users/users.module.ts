import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity'; // 👈 Verifica esta importación

@Module({
  imports: [
    // 💡 Registramos ambas entidades en las dependencias locales del módulo
    TypeOrmModule.forFeature([User, Role]), 
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}