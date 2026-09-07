// approve-transaction.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum AdminTransactionAction {
    APPROVE = 'APPROVE',
    REJECT = 'REJECT',
}

export class ReviewTransactionDto {
    @IsNotEmpty({ message: 'La acción a realizar es obligatoria.' })
    @IsEnum(AdminTransactionAction, { message: 'Acción no válida.' })
    action: AdminTransactionAction;

    @IsOptional()
    @IsString({ message: 'El motivo de rechazo debe ser un texto.' })
    rejectionReason?: string;
}