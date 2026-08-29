-- CreateTable
CREATE TABLE `events` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('Gala Anual', 'Masterclass', 'Competencia', 'Muestra', 'Otro') NOT NULL DEFAULT 'Muestra',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `ticketsSold` INTEGER NOT NULL DEFAULT 0,
    `totalTickets` INTEGER NOT NULL DEFAULT 0,
    `ticketPrice` DECIMAL(10, 2) NOT NULL,
    `productionStatus` ENUM('Planificación', 'Ensayos Generales', 'Completado', 'Agotado', 'Cancelado') NOT NULL DEFAULT 'Planificación',
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `events_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
