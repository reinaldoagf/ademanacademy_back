/*
  Warnings:

  - You are about to drop the column `grupoId` on the `seatingmapelement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `seatingmapelement` DROP COLUMN `grupoId`,
    ADD COLUMN `groupId` VARCHAR(191) NULL;
