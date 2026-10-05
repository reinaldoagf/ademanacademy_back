

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CostumesService } from './costumes.service';
import { CostumesController } from './costumes.controller';
import { S3Module } from '../s3/s3.module';

@Module({
    imports: [ // Nos permite leer el JWT_SECRET de las variables de entorno
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '1d' }, // El token expira en 24 horas
            }),
        }),
        S3Module
    ],
    controllers: [CostumesController],
    providers: [CostumesService],
    exports: [JwtModule, CostumesService]
})
export class CostumesModule { }