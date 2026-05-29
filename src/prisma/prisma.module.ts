import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // 👈 Debe ser global
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule { }