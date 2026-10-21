/*
  Warnings:

  - You are about to drop the column `name` on the `supplier` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `Supplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Supplier` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `students` ADD COLUMN `specialRehearsalId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `supplier` DROP COLUMN `name`,
    ADD COLUMN `firstName` VARCHAR(191) NOT NULL,
    ADD COLUMN `lastName` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `special_rehearsals` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `date` DATE NOT NULL,
    `startTime` VARCHAR(10) NOT NULL,
    `endTime` VARCHAR(10) NOT NULL,
    `classroomId` VARCHAR(191) NULL,
    `location` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `special_rehearsals_date_idx`(`date`),
    INDEX `special_rehearsals_classroomId_idx`(`classroomId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_specialRehearsalId_fkey` FOREIGN KEY (`specialRehearsalId`) REFERENCES `special_rehearsals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `special_rehearsals` ADD CONSTRAINT `special_rehearsals_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `classrooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
