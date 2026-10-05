/*
  Warnings:

  - You are about to drop the column `price` on the `seating_map_elements` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `seating_map_elements` DROP COLUMN `price`,
    ADD COLUMN `presalePrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `salePrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
