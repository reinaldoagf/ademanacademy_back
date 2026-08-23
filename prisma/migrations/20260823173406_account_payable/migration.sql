-- AlterTable
ALTER TABLE `transactions` MODIFY `method` ENUM('Transferencia', 'Tarjeta', 'Efectivo', 'Pago Móvil', 'Cheque', 'Otro') NOT NULL;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `dni` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Supplier_dni_key`(`dni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_payables` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NULL,
    `supplierName` VARCHAR(191) NOT NULL,
    `supplierDni` VARCHAR(191) NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `concept` VARCHAR(191) NOT NULL,
    `amountTotal` DOUBLE NOT NULL,
    `amountPaid` DOUBLE NOT NULL DEFAULT 0,
    `amountRemaining` DOUBLE NOT NULL,
    `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NOT NULL,
    `status` ENUM('Pendiente', 'Pagado parcialmente', 'Pagado', 'Anulada / Cancelada') NOT NULL DEFAULT 'Pendiente',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `account_payables_status_idx`(`status`),
    INDEX `account_payables_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payable_payments` (
    `id` VARCHAR(191) NOT NULL,
    `accountPayableId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `method` ENUM('Transferencia', 'Tarjeta', 'Efectivo', 'Pago Móvil', 'Cheque', 'Otro') NOT NULL DEFAULT 'Pago Móvil',
    `referenceNumber` VARCHAR(191) NULL,
    `receiptUrl` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payable_payments_accountPayableId_idx`(`accountPayableId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `account_payables` ADD CONSTRAINT `account_payables_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payable_payments` ADD CONSTRAINT `payable_payments_accountPayableId_fkey` FOREIGN KEY (`accountPayableId`) REFERENCES `account_payables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
