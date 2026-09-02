import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SeatingMapsService } from './seating-maps.service';
import { SeatingMapsController } from './seating-maps.controller';

@Module({
    imports: [JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: { expiresIn: '1d' }, // El token expira en 24 horas
        }),
    })],
    controllers: [SeatingMapsController],
    providers: [SeatingMapsService],
    exports: [SeatingMapsService],
})
export class SeatingMapsModule { }