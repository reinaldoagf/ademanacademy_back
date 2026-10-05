/*
  Warnings:

  - You are about to drop the column `images` on the `costumes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[key]` on the table `event_images` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key]` on the table `product_images` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key]` on the table `uniform_images` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `costumes` DROP COLUMN `images`;

-- CreateTable
CREATE TABLE `costume_images` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `altText` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'gallery',
    `order` INTEGER NOT NULL DEFAULT 0,
    `costumeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `costume_images_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `event_images_key_key` ON `event_images`(`key`);

-- CreateIndex
CREATE UNIQUE INDEX `product_images_key_key` ON `product_images`(`key`);

-- CreateIndex
CREATE UNIQUE INDEX `uniform_images_key_key` ON `uniform_images`(`key`);

-- AddForeignKey
ALTER TABLE `costume_images` ADD CONSTRAINT `costume_images_costumeId_fkey` FOREIGN KEY (`costumeId`) REFERENCES `costumes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
