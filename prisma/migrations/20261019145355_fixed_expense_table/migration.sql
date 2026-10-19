-- CreateTable
CREATE TABLE `fixed_expenses` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `frequency` ENUM('Semanal', 'Quincenal', 'Mensual', 'Anual') NOT NULL DEFAULT 'Mensual',
    `nextDueDate` DATE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `supplierId` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `fixed_expenses` ADD CONSTRAINT `fixed_expenses_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
