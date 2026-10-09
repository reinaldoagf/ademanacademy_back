-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `channel` ENUM('IN_APP', 'WHATSAPP', 'BOTH') NOT NULL DEFAULT 'IN_APP',
    `status` ENUM('PENDING', 'SENT', 'READ', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `userId` VARCHAR(36) NULL,
    `recipientPhone` VARCHAR(40) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
