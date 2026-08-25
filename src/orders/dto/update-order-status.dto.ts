import { IsNotEmpty, IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
    @IsNotEmpty({ message: 'El nuevo estado es obligatorio' })
    @IsEnum(OrderStatus, { message: 'El estado del pedido no es válido' })
    status: OrderStatus;
}