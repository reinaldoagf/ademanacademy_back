-- AlterTable
ALTER TABLE `event_seats` ADD COLUMN `paymentOrderId` VARCHAR(255) NULL,
    MODIFY `status` ENUM('Disponible', 'Reservado', 'Pendiente', 'Pagado') NOT NULL DEFAULT 'Disponible';

-- AddForeignKey
ALTER TABLE `event_seats` ADD CONSTRAINT `event_seats_paymentOrderId_fkey` FOREIGN KEY (`paymentOrderId`) REFERENCES `payment_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
