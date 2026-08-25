import { IsNotEmpty, IsString, IsArray, ValidateNested, ArrayMinSize, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
    @IsNotEmpty({ message: 'El userId es obligatorio' })
    @IsString()
    userId: string;

    @IsOptional()
    @IsEnum(OrderStatus, { message: 'El estado del pedido no es válido' })
    status?: OrderStatus;

    @IsNotEmpty({ message: 'El pedido debe incluir al menos un ítem' })
    @IsArray()
    @ArrayMinSize(1, { message: 'El pedido debe incluir al menos un ítem' })
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];
}