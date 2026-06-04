// src/transactions/dto/update-transaction.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';

// Permite actualizaciones parciales (ej: solo cambiar el estado de Pendiente a Aprobado)
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) { }