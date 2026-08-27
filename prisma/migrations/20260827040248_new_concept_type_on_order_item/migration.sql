/*
  Warnings:

  - The values [Mensualidad,Matrícula] on the enum `order_items_concept` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `order_items` MODIFY `concept` ENUM('Vestuario', 'Uniforme', 'Entradas Gala', 'Producto') NOT NULL;
