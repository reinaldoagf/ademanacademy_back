import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GroupCategoriesService } from './group-categories.service';
import { GroupCategoriesController } from './group-categories.controller';

@Module({
    imports: [ // Nos permite leer el JWT_SECRET de las variables de entorno
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '1d' }, // El token expira en 24 horas
            }),
        })],
    controllers: [GroupCategoriesController],
    providers: [GroupCategoriesService],
    exports: [JwtModule, GroupCategoriesService],
})
export class GroupCategoriesModule { }