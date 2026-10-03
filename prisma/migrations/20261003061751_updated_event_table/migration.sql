-- AlterTable
ALTER TABLE `events` ADD COLUMN `isPresaleActive` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `presaleEndDate` DATETIME(3) NULL,
    ADD COLUMN `presaleStartDate` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `event_images` (
    `id` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `altText` VARCHAR(191) NULL,
    `type` ENUM('cover', 'banner', 'gallery') NOT NULL DEFAULT 'gallery',
    `order` INTEGER NOT NULL DEFAULT 0,
    `eventId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sponsors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `logoUrl` TEXT NOT NULL,
    `tier` ENUM('main', 'gold', 'silver', 'bronze') NOT NULL DEFAULT 'silver',
    `websiteUrl` VARCHAR(191) NULL,
    `socialLinks` JSON NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_images` ADD CONSTRAINT `event_images_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sponsors` ADD CONSTRAINT `sponsors_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
