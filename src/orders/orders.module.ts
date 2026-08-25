import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
    imports: [JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: { expiresIn: '1d' }, // El token expira en 24 horas
        }),
    })],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [JwtModule, OrdersService],
})
export class OrdersModule { }