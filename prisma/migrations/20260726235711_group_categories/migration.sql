/*
  Warnings:

  - You are about to drop the column `category` on the `groups` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `groups` DROP COLUMN `category`,
    ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `group-categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `minimumAge` INTEGER NOT NULL DEFAULT 1,
    `maximumAge` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `group-categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `group-categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
