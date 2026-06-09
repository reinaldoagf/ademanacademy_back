-- CreateTable
CREATE TABLE `classrooms` (
    `id` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `maxCapacity` INTEGER NOT NULL,
    `type` ENUM('Espejos', 'Urbano', 'Libre', 'theories') NOT NULL,
    `status` ENUM('Activo', 'Mantenimiento') NOT NULL DEFAULT 'Activo',
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `classrooms_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
