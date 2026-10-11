/*
  Warnings:

  - You are about to drop the column `otpCode` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `otpCodeExpiry` on the `clients` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `clients` DROP COLUMN `otpCode`,
    DROP COLUMN `otpCodeExpiry`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `otpCode` VARCHAR(180) NULL,
    ADD COLUMN `otpCodeExpiry` DATETIME(3) NULL;
