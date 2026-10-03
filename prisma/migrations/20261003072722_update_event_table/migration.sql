/*
  Warnings:

  - You are about to drop the column `code` on the `events` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `events_code_key` ON `events`;

-- AlterTable
ALTER TABLE `events` DROP COLUMN `code`;
