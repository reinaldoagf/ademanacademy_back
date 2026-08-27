-- AlterTable
ALTER TABLE `payment_orders` MODIFY `concept` ENUM('Mensualidad', 'Matrícula', 'Vestuario', 'Entradas Gala', 'Producto') NOT NULL;

-- AlterTable
ALTER TABLE `transactions` MODIFY `concept` ENUM('Mensualidad', 'Matrícula', 'Vestuario', 'Entradas Gala', 'Producto') NOT NULL;
