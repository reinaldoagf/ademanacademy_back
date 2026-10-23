-- AlterTable
ALTER TABLE `employees` ADD COLUMN `baseSalary` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `fixed_expenses` ADD COLUMN `employeeId` VARCHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `fixed_expenses` ADD CONSTRAINT `fixed_expenses_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
