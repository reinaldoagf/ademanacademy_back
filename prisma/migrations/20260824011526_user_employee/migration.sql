/*
  Warnings:

  - You are about to alter the column `userId` on the `employees` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(36)`.
  - You are about to drop the column `employeeId` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `employees` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_employeeId_fkey`;

-- DropIndex
DROP INDEX `users_employeeId_key` ON `users`;

-- AlterTable
ALTER TABLE `employees` MODIFY `userId` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `employeeId`;

-- CreateIndex
CREATE UNIQUE INDEX `employees_userId_key` ON `employees`(`userId`);

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
