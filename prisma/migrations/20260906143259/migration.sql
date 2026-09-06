/*
  Warnings:

  - You are about to alter the column `type` on the `seating_map_elements` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(25))`.

*/
-- AlterTable
ALTER TABLE `seating_map_elements` ADD COLUMN `itemType` ENUM('Tarima pista', 'Silla VIP', 'Silla general', 'Silla de patrocinante', 'Silla preferencial') NOT NULL DEFAULT 'Silla general',
    MODIFY `type` ENUM('Silla', 'Tarima') NOT NULL DEFAULT 'Silla';
