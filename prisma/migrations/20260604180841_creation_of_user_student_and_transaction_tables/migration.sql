-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `dni` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(180) NOT NULL,
    `phone` VARCHAR(180) NOT NULL,
    `password` VARCHAR(255) NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `profileOnboarding` BOOLEAN NOT NULL DEFAULT false,
    `profileType` ENUM('representative', 'student') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_dni_key`(`dni`),
    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `id` VARCHAR(191) NOT NULL,
    `dni` VARCHAR(30) NOT NULL,
    `firstName` VARCHAR(150) NOT NULL,
    `lastName` VARCHAR(150) NOT NULL,
    `birthDate` DATE NOT NULL,
    `kinship` ENUM('Hijo', 'Hija', 'Sobrino', 'Sobrina', 'Tutorado', 'Otro') NOT NULL DEFAULT 'Hijo',
    `medicalObservations` TEXT NULL,
    `userId` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `students_dni_key`(`dni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NULL,
    `concept` ENUM('Mensualidad', 'Matrícula', 'Uniforme', 'Entradas Gala') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` ENUM('Transferencia', 'Tarjeta', 'Efectivo', 'Pago Móvil') NOT NULL,
    `status` ENUM('Aprobado', 'Pendiente') NOT NULL DEFAULT 'Pendiente',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
