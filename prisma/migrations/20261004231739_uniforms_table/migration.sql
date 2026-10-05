/*
  Warnings:

  - You are about to drop the column `images` on the `uniforms` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `uniforms` DROP COLUMN `images`;

-- CreateTable
CREATE TABLE `uniform_images` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `altText` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'gallery',
    `order` INTEGER NOT NULL DEFAULT 0,
    `uniformId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `uniform_images` ADD CONSTRAINT `uniform_images_uniformId_fkey` FOREIGN KEY (`uniformId`) REFERENCES `uniforms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
