/*
  Warnings:

  - You are about to drop the column `receiptPath` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `transactions` DROP COLUMN `receiptPath`;

-- CreateTable
CREATE TABLE `image_of_payment_receipts` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `altText` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `image_of_payment_receipts_key_key`(`key`),
    UNIQUE INDEX `image_of_payment_receipts_transactionId_key`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `image_of_payment_receipts` ADD CONSTRAINT `image_of_payment_receipts_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
