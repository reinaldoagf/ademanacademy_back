/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `employees` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `employees` ADD COLUMN `email` VARCHAR(180) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `employees_email_key` ON `employees`(`email`);
