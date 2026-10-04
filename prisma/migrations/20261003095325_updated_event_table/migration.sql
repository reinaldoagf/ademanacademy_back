/*
  Warnings:

  - You are about to drop the `event_images` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `event_images` DROP FOREIGN KEY `event_images_eventId_fkey`;

-- AlterTable
ALTER TABLE `events` ADD COLUMN `images` JSON NULL;

-- DropTable
DROP TABLE `event_images`;
