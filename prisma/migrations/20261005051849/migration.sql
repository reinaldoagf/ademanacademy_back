/*
  Warnings:

  - You are about to alter the column `presalePrice` on the `seating_map_elements` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.
  - You are about to alter the column `salePrice` on the `seating_map_elements` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Double`.

*/
-- AlterTable
ALTER TABLE `seating_map_elements` MODIFY `presalePrice` DOUBLE NOT NULL DEFAULT 0.00,
    MODIFY `salePrice` DOUBLE NOT NULL DEFAULT 0.00;
