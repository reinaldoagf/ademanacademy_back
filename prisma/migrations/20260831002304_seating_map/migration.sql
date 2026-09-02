-- CreateTable
CREATE TABLE `SeatingMap` (
    `id` VARCHAR(191) NOT NULL,
    `totalWidth` DOUBLE NOT NULL,
    `totalHigh` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeatingMapElement` (
    `id` VARCHAR(191) NOT NULL,
    `itemID` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `chairNumber` VARCHAR(191) NULL,
    `grupoId` VARCHAR(191) NULL,
    `rotation` DOUBLE NOT NULL,
    `groupRotation` DOUBLE NOT NULL,
    `price` DOUBLE NOT NULL,
    `xMeters` DOUBLE NOT NULL,
    `yMeters` DOUBLE NOT NULL,
    `widthMeters` DOUBLE NOT NULL,
    `tallMeters` DOUBLE NOT NULL,
    `seatingMapId` VARCHAR(191) NOT NULL,

    INDEX `SeatingMapElement_seatingMapId_idx`(`seatingMapId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SeatingMapElement` ADD CONSTRAINT `SeatingMapElement_seatingMapId_fkey` FOREIGN KEY (`seatingMapId`) REFERENCES `SeatingMap`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
