-- AlterTable
ALTER TABLE `employees` ADD COLUMN `typeOfEmployee` ENUM('Personal Administrativo y de Gestión', 'Personal Docente y Artístico', 'Personal de Soporte y Operaciones') NOT NULL DEFAULT 'Personal Administrativo y de Gestión';
