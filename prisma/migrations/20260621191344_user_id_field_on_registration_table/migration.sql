-- AlterTable
ALTER TABLE `registrations` ADD COLUMN `userId` VARCHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
