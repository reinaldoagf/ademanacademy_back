// /src/costumes/costumes.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { LockerRoomStatus } from '@prisma/client';
import { GetCostumesFilterDto } from './dto/get-costumes-filter.dto';
import { AssignCostumeDto, UpdateAssignmentStatusDto } from './dto/assign-costume.dto';

@Injectable()
export class CostumesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: any) {
        // 1. Asegúrate de que 'availableSizes' sea un objeto/array de JS real, NO un string
        let sizes = data.availableSizes;
        if (typeof sizes === 'string') {
            try {
                sizes = JSON.parse(sizes);
            } catch (e) {
                sizes = []; // Fallback seguro
            }
        }

        // 2. Asegúrate de que 'images' sea un array de JS real, NO un string JSON
        let imagesPaths = data.images;
        if (typeof imagesPaths === 'string') {
            try {
                imagesPaths = JSON.parse(imagesPaths);
            } catch (e) {
                imagesPaths = []; // Fallback seguro
            }
        }

        // 3. Al guardar con Prisma, pásale los objetos de JS directamente
        try {
            return await this.prisma.costume.create({
                data: {
                    name: data.name,
                    beat: data.beat,
                    category: data.category,
                    status: data.status,
                    availableSizes: sizes,
                    images: imagesPaths,
                },
            });
        } catch (error) {

            // Manejo específico del error de duplicado de Prisma (P2002 = Unique constraint failed)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`Ya existe un vestuario con el nombre "${data.name}".`);
            }

            throw error;
        }
    }
    async findAll(filters: GetCostumesFilterDto) {
        const { page = 1, limit = 10, search, category, status } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (category) where.category = category;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { beat: { contains: search } },
            ];
        }

        const [totalItems, data] = await Promise.all([
            this.prisma.costume.count({ where }),
            this.prisma.costume.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    assignments: {
                        include: { student: true }
                    }
                }
            }),
        ]);

        // Rehidratar el JSON de tallas para el Front-end
        const parsedData = data.map(item => ({
            ...item,
            availableSizes: typeof item.availableSizes === 'string' ? JSON.parse(item.availableSizes) : item.availableSizes,
            images: typeof item.images === 'string' ? JSON.parse(item.images) : item.images,
        }));

        return {
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
            },
            data: parsedData,
        };
    }

    async findOne(id: string) {
        const costume = await this.prisma.costume.findUnique({
            where: { id },
            include: {
                assignments: {
                    include: { student: true }
                }
            }
        });
        if (!costume) throw new NotFoundException('Vestuario no encontrado.');

        return {
            ...costume,
            availableSizes: typeof costume.availableSizes === 'string' ? JSON.parse(costume.availableSizes) : costume.availableSizes,
        };
    }

    async update(id: string, updateData: any) {
        // 1. Obtener el registro actual
        const currentCostume = await this.findOne(id);
        if (!currentCostume) {
            throw new NotFoundException(`Vestuario con ID ${id} no encontrado`);
        }

        const { availableSizes, existingImages = [], newImages = [], ...data } = updateData;

        // 2. Parsear las imágenes actuales que están guardadas en la Base de Datos
        let currentDBImages: string[] = [];
        try {
            if (typeof currentCostume.images === 'string') {
                currentDBImages = JSON.parse(currentCostume.images);
            } else if (Array.isArray(currentCostume.images)) {
                currentDBImages = currentCostume.images as string[];
            }
        } catch (e) {
            console.error("Error parseando imágenes de la BD:", e);
        }

        // 3. Determinar cuáles imágenes fueron eliminadas en el frontend
        // Las que existían en BD pero ya no están en las 'existingImages' enviadas
        const imagesToDelete = currentDBImages.filter(
            (img) => !existingImages.includes(img)
        );

        // 4. Eliminar físicamente los archivos descartados del servidor
        for (const relativePath of imagesToDelete) {
            // El path relativo suele ser '/uploads/costumes/archivo.jpg'
            // Le quitamos la barra inicial si es necesario para resolverlo correctamente desde la raíz
            const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
            const absolutePath = path.resolve(process.cwd(), cleanPath);

            fs.unlink(absolutePath, (err) => {
                if (err) {
                    console.error(`No se pudo eliminar el archivo físico: ${absolutePath}`, err);
                } else {
                    console.log(`Archivo físico eliminado con éxito: ${absolutePath}`);
                }
            });
        }

        // 5. Unificar las imágenes conservadas con las nuevas subidas
        const updatedImagesList = [...existingImages, ...newImages];

        // 6. Actualizar en la base de datos
        return this.prisma.costume.update({
            where: { id },
            data: {
                ...data,
                images: JSON.stringify(updatedImagesList),
                ...(availableSizes && { availableSizes: JSON.stringify(availableSizes) }),
            },
        });
    }

    async remove(id: string) {
        // 1. Buscar el vestuario para obtener las rutas de sus imágenes
        const costume = await this.findOne(id); // o this.costumeRepository.findOne({ where: { id } }) según tu ORM

        if (!costume) {
            throw new NotFoundException(`El vestuario con ID "${id}" no existe.`);
        }
        const rawJsonArray = costume.images as unknown as string[];
        // 2. Eliminar las imágenes físicas del servidor si existen
        if (rawJsonArray && Array.isArray(rawJsonArray) && rawJsonArray.length) {

            const images: string[] = Array.isArray(rawJsonArray)
                ? rawJsonArray.filter((item): item is string => typeof item === 'string')
                : [];

            this.deletePhysicalFiles(images);
        }

        // 3. Eliminar el registro de la base de datos
        await this.prisma.costume.delete({ where: { id } }); // Adapta según Mongoose / TypeORM / Prisma

        return {
            message: 'Vestuario e imágenes asociadas eliminados correctamente.',
            id,
        };
    }
    /**
       * Helper privado para eliminar archivos físicamente del disco de forma segura
       */
    private deletePhysicalFiles(filePaths: string[]) {
        filePaths.forEach((relativeUrlPath) => {
            if (!relativeUrlPath) return;

            // Convertimos la URL relativa (/uploads/costumes/costume-123.jpg) en ruta absoluta del sistema
            // .replace(/^\//, '') remueve la barra inicial para evitar inconsistencias en path.join
            const normalizedPath = relativeUrlPath.replace(/^\//, '');
            const fullPath = path.join(process.cwd(), normalizedPath);

            // Verificamos si el archivo existe antes de intentar borrarlo
            if (fs.existsSync(fullPath)) {
                try {
                    fs.unlinkSync(fullPath);
                } catch (error) {
                    // Logueamos el error sin detener el proceso principal de borrado en BD
                    console.error(`Error al eliminar la imagen en ${fullPath}:`, error);
                }
            }
        });
    }
    // 🎯 ASIGNAR VESTUARIO A UN ALUMNO
    async assignToStudent(costumeId: string, assignDto: AssignCostumeDto) {
        // Validar existencia de entidades
        const costume = await this.prisma.costume.findUnique({ where: { id: costumeId } });
        if (!costume) throw new NotFoundException('Vestuario no encontrado.');

        const student = await this.prisma.student.findUnique({ where: { id: assignDto.studentId } });
        if (!student) throw new NotFoundException('Estudiante no encontrado.');

        // Crear asignación
        return this.prisma.studentCostume.create({
            data: {
                costumeId,
                studentId: assignDto.studentId,
                assignedSize: assignDto.assignedSize,
                observations: assignDto.observations,
                status: 'assigned',
            },
            include: { student: true, costume: true }
        });
    }

    // 🎯 ACTUALIZAR ESTADO DE LA ASIGNACIÓN (DEVOLVER/DAÑADO/EXTRAVIADO)
    async updateAssignmentStatus(assignmentId: string, dto: UpdateAssignmentStatusDto) {
        const assignment = await this.prisma.studentCostume.findUnique({ where: { id: assignmentId } });
        if (!assignment) throw new NotFoundException('Registro de asignación no encontrado.');

        return this.prisma.studentCostume.update({
            where: { id: assignmentId },
            data: {
                status: dto.status,
                observations: dto.observations,
                ...(dto.status !== 'assigned' && { returnedAt: new Date() }),
            },
        });
    }

    /**
   * Obtiene la cantidad de vestuarios agrupados por estado.
   * Retorna una estructura con el total general y el detalle por cada status.
   */
    async getCountByStatus() {
        // 1. Agrupamiento directamente desde la base de datos con Prisma
        const countsByStatus = await this.prisma.costume.groupBy({
            by: ['status'],
            _count: {
                status: true,
            },
        });

        // 2. Mapeamos la respuesta inicial en un objeto base con valores en 0
        const statusMap = Object.values(LockerRoomStatus).reduce((acc, status) => {
            acc[status] = 0;
            return acc;
        }, {} as Record<LockerRoomStatus, number>);

        let total = 0;

        // 3. Rellenamos con los conteos reales obtenidos
        countsByStatus.forEach((group) => {
            const count = group._count.status;
            statusMap[group.status] = count;
            total += count;
        });

        return {
            total,
            byStatus: statusMap,
        };
    }
}