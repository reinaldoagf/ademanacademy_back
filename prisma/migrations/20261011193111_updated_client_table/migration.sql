-- AlterTable
ALTER TABLE `clients` ADD COLUMN `otpCode` VARCHAR(180) NULL,
    ADD COLUMN `otpCodeExpiry` DATETIME(3) NULL;
