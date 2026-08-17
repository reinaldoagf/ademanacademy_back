import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta según la ubicación de tu PrismaService
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createProductDto: CreateProductDto) {
        const existingProduct = await this.prisma.product.findUnique({
            where: { name: createProductDto.name },
        });

        if (existingProduct) {
            throw new ConflictException(`El producto con el nombre "${createProductDto.name}" ya existe.`);
        }

        const { images, ...data } = createProductDto;

        return this.prisma.product.create({
            data: {
                ...data,
                images: images ? (images as unknown as Prisma.InputJsonValue) : [],
            },
            include: {
                category: true,
            },
        });
    }

    async findAll(params?: {
        page?: number;
        limit?: number;
        search?: string;
        categoryId?: string;
        isActive?: boolean;
    }) {
        const { page = 1, limit = 10, search, categoryId, isActive } = params || {};
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {};

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { description: { contains: search } },
            ];
        }

        if (categoryId) {
            where.categoryId = categoryId;
        }

        if (typeof isActive === 'boolean') {
            where.isActive = isActive;
        }

        const [total, data] = await Promise.all([
            this.prisma.product.count({ where }),
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    category: true,
                },
            }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
            },
        });

        if (!product) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
        }

        return product;
    }

    async update(id: string, updateProductDto: UpdateProductDto) {
        await this.findOne(id); // Verifica si existe

        if (updateProductDto.name) {
            const existingName = await this.prisma.product.findFirst({
                where: {
                    name: updateProductDto.name,
                    NOT: { id }
                },
            });

            if (existingName) {
                throw new ConflictException(`Ya existe otro producto con el nombre "${updateProductDto.name}".`);
            }
        }

        const { images, ...data } = updateProductDto;

        return this.prisma.product.update({
            where: { id },
            data: {
                ...data,
                ...(images && { images: images as unknown as Prisma.InputJsonValue }),
            },
            include: {
                category: true,
            },
        });
    }

    async remove(id: string) {
        // 1. Buscar el producto para obtener las rutas de sus imágenes
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException(`El producto con ID "${id}" no existe.`);
        }

        // Parsear o extraer el arreglo de imágenes seguras
        let rawJsonArray: string[] = [];

        if (typeof product.images === 'string') {
            try {
                rawJsonArray = JSON.parse(product.images);
            } catch (e) {
                rawJsonArray = [];
            }
        } else if (Array.isArray(product.images)) {
            rawJsonArray = product.images as unknown as string[];
        }

        // 2. Eliminar las imágenes físicas del servidor si existen
        if (rawJsonArray && Array.isArray(rawJsonArray) && rawJsonArray.length) {
            const images: string[] = rawJsonArray.filter(
                (item): item is string => typeof item === 'string',
            );

            this.deletePhysicalFiles(images);
        }

        // 3. Eliminar el registro de la base de datos
        await this.prisma.product.delete({ where: { id } });

        return {
            message: 'Producto e imágenes asociadas eliminados correctamente.',
            id,
        };
    }


    /**
   * Método auxiliar para borrar físicamente los archivos del sistema
   */
    private deletePhysicalFiles(imagePaths: string[]) {
        imagePaths.forEach((imagePath) => {
            try {
                // Omite URLs externas (http/https)
                if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                    return;
                }

                // Limpia la barra inicial si existe
                const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;

                // Construye la ruta absoluta en el sistema de archivos
                const fullPath = path.resolve(process.cwd(), cleanPath);

                // Verifica la existencia y elimina
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            } catch (error) {
                console.error(`Error al eliminar el archivo físico: ${imagePath}`, error);
            }
        });
    }

    // Método útil para alertas de stock mínimo en el Dashboard de la academia
    async getLowStockAlerts() {
        return this.prisma.product.findMany({
            where: {
                isActive: true,
                currentStock: {
                    lte: this.prisma.product.fields.minimumStockAlert,
                },
            },
            include: {
                category: true,
            },
        });
    }
}