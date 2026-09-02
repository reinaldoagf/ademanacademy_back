/*
  Warnings:

  - Added the required column `height` to the `SeatingMapElement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `SeatingMapElement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `seatingmapelement` ADD COLUMN `height` DOUBLE NOT NULL,
    ADD COLUMN `width` DOUBLE NOT NULL,
    ADD COLUMN `x` DOUBLE NULL,
    ADD COLUMN `y` DOUBLE NULL;
