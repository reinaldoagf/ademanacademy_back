import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventSeatsService } from './event-seats.service';
import { EventSeatsController } from './event-seats.controller';
import { EventSeatsGateway } from './event-seats.gateway';

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '1d' }, // El token expira en 24 horas
            }),
        })
    ],
    controllers: [EventSeatsController],
    providers: [
        EventSeatsService,
        EventSeatsGateway
    ],
    exports: [JwtModule, EventSeatsService, EventSeatsGateway]
})
export class EventSeatsModule { }