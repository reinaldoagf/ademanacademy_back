/*
  Warnings:

  - You are about to alter the column `amount` on the `fixed_expenses` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.

*/
-- AlterTable
ALTER TABLE `fixed_expenses` MODIFY `amount` DOUBLE NOT NULL;
