-- AlterTable
ALTER TABLE `payment_orders` ADD COLUMN `studentId` VARCHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `payment_orders` ADD CONSTRAINT `payment_orders_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
