-- AlterTable
ALTER TABLE `registrations` MODIFY `status` ENUM('Pre Registrado', 'Aprobado', 'Pendiente', 'Rechazado') NOT NULL DEFAULT 'Pendiente';
