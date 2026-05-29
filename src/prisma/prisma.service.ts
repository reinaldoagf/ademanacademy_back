// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        if (!process.env.DATABASE_URL) {
            throw new Error('❌ La variable DATABASE_URL no está definida en tu archivo .env');
        }

        /**
         * 💡 SOLUCIÓN DEFINITIVA: 
         * En Prisma v7, le pasas la URL en texto plano directamente al constructor de PrismaMariaDB.
         * El adaptador configurará el pool internamente usando el paquete 'mariadb' de tus dependencias.
         */
        const adapter = new PrismaMariaDb(process.env.DATABASE_URL);

        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}