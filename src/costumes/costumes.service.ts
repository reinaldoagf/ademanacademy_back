// /src/costumes/costumes.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCostumeDto } from './dto/create-costume.dto';
import { UpdateCostumeDto } from './dto/update-costume.dto';
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
        return this.prisma.costume.create({
            data: {
                name: data.name,
                beat: data.beat,
                category: data.category,
                status: data.status,

                // 🎯 AQUÍ ESTÁ EL TRUCO: Pasamos arrays de JS directamente. 
                // Prisma se encargará de guardarlos como JSON de forma nativa en la BD.
                availableSizes: sizes,
                images: imagesPaths,
            },
        });
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
        await this.findOne(id);
        return this.prisma.costume.delete({ where: { id } });
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
}