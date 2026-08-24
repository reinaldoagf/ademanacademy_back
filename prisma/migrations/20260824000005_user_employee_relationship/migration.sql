/*
  Warnings:

  - You are about to drop the column `userId` on the `employees` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `employees` DROP FOREIGN KEY `employees_userId_fkey`;

-- DropIndex
DROP INDEX `employees_userId_fkey` ON `employees`;

-- AlterTable
ALTER TABLE `employees` DROP COLUMN `userId`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `employeeId` VARCHAR(36) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_employeeId_key` ON `users`(`employeeId`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
