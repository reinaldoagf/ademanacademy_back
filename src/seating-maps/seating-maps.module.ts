import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SeatingMapsService } from './seating-maps.service';
import { SeatingMapsController } from './seating-maps.controller';
import * as express from 'express';

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
export class SeatingMapsModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(express.json({ limit: '50mb' })) // Ajusta el límite que necesites (ej. 50mb)
            .forRoutes(
                { path: 'seating-maps', method: RequestMethod.POST },
                { path: 'seating-maps/:id', method: RequestMethod.PATCH },
                { path: 'seating-maps/:id', method: RequestMethod.PUT },
            );
    }
}