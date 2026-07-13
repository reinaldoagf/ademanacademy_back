-- CreateTable
CREATE TABLE `costumes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `beat` VARCHAR(100) NULL,
    `category` ENUM('Baby', 'Infantil', 'Juvenil', 'Adulto') NOT NULL DEFAULT 'Baby',
    `status` ENUM('pending_preparation', 'available', 'maintenance', 'retired') NOT NULL DEFAULT 'pending_preparation',
    `availableSizes` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `costumes_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_costumes` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `costumeId` VARCHAR(191) NOT NULL,
    `assignedSize` VARCHAR(10) NOT NULL,
    `status` ENUM('assigned', 'returned', 'damaged', 'lost') NOT NULL DEFAULT 'assigned',
    `observations` TEXT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_costumes` ADD CONSTRAINT `student_costumes_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_costumes` ADD CONSTRAINT `student_costumes_costumeId_fkey` FOREIGN KEY (`costumeId`) REFERENCES `costumes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
