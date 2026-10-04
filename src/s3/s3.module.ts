// src/s3/s3.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import { S3Controller } from './s3.controller';

@Module({
    imports: [// Nos permite leer el JWT_SECRET de las variables de entorno
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '1d' }, // El token expira en 24 horas
            }),
        })

    ],
    controllers: [S3Controller],
    providers: [S3Service],
    exports: [S3Service], // 👈 ¡Súper importante! Si no lo exportas, no se podrá usar en otros módulos.
})
export class S3Module { }