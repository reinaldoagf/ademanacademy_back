-- CreateTable
CREATE TABLE `uniforms` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `category` ENUM('Baby', 'Infantil', 'Juvenil', 'Adulto') NOT NULL DEFAULT 'Baby',
    `status` ENUM('Pendiente por pago', 'Confeccionando', 'Disponible', 'Retirado') NOT NULL DEFAULT 'Pendiente por pago',
    `price` DECIMAL(10, 2) NOT NULL,
    `images` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uniforms_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_uniforms` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `uniformId` VARCHAR(191) NOT NULL,
    `assignedSize` VARCHAR(10) NOT NULL,
    `status` ENUM('assigned', 'returned', 'damaged', 'lost') NOT NULL DEFAULT 'assigned',
    `observations` TEXT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `costumeId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_uniforms` ADD CONSTRAINT `student_uniforms_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_uniforms` ADD CONSTRAINT `student_uniforms_uniformId_fkey` FOREIGN KEY (`uniformId`) REFERENCES `uniforms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_uniforms` ADD CONSTRAINT `student_uniforms_costumeId_fkey` FOREIGN KEY (`costumeId`) REFERENCES `costumes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
