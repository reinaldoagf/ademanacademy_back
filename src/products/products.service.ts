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

export interface ProductMetricsResponse {
    inventoryValue: number;
    lowStockProducts: number;
    outOfStockProducts: number;
}

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

        // Solo filtra por estado si es un booleano definido
        if (typeof isActive === 'boolean') {
            where.isActive = isActive;
        }

        const [totalItems, data] = await Promise.all([
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
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
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

    async update(
        id: string,
        updateProductDto: any,
        existingImages: string[] = [],
        newFilePaths: string[] = [],
    ) {
        // 1. Obtener el producto actual de la base de datos
        const currentProduct = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!currentProduct) {
            throw new NotFoundException(`El producto con ID "${id}" no existe.`);
        }

        // 2. Validar nombre duplicado si se intenta cambiar
        if (updateProductDto.name && updateProductDto.name !== currentProduct.name) {
            const existingName = await this.prisma.product.findFirst({
                where: {
                    name: updateProductDto.name,
                    NOT: { id },
                },
            });

            if (existingName) {
                throw new ConflictException(
                    `Ya existe otro producto con el nombre "${updateProductDto.name}".`,
                );
            }
        }

        // 3. Normalizar URLs de existingImages a rutas relativas (ej. /uploads/products/...)
        const cleanExistingImages = existingImages.map((imgUrl) => {
            try {
                if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
                    const parsedUrl = new URL(imgUrl);
                    return parsedUrl.pathname;
                }
            } catch (e) {
                // En caso de que no sea una URL válida, se deja tal cual
            }
            return imgUrl;
        });

        // 4. Extraer el listado de imágenes actuales en BD
        let currentDbImages: string[] = [];
        if (typeof currentProduct.images === 'string') {
            try {
                currentDbImages = JSON.parse(currentProduct.images);
            } catch (e) {
                currentDbImages = [];
            }
        } else if (Array.isArray(currentProduct.images)) {
            currentDbImages = currentProduct.images as unknown as string[];
        }

        // 5. Identificar y eliminar físicamente las imágenes borradas por el usuario
        const imagesToDelete = currentDbImages.filter(
            (dbImg) => !cleanExistingImages.includes(dbImg),
        );

        if (imagesToDelete.length > 0) {
            this.deletePhysicalFiles(imagesToDelete);
        }

        // 6. Fusionar las imágenes que se mantienen con las nuevas subidas
        const finalImages = [...cleanExistingImages, ...newFilePaths];

        // 7. Desestructurar para omitir campos auxiliares de imágenes del DTO
        const { existingImages: _, images: __, ...data } = updateProductDto;

        // Convertir tipos numéricos y booleanos si vienen desde FormData
        const formattedData = {
            ...data,
            ...(data.cost !== undefined && { cost: Number(data.cost) }),
            ...(data.salePrice !== undefined && { salePrice: Number(data.salePrice) }),
            ...(data.currentStock !== undefined && { currentStock: Number(data.currentStock) }),
            ...(data.minimumStockAlert !== undefined && {
                minimumStockAlert: Number(data.minimumStockAlert),
            }),
            ...(data.isActive !== undefined && {
                isActive: String(data.isActive) === 'true' || data.isActive === true,
            }),
        };

        // 8. Actualizar en la BD
        return this.prisma.product.update({
            where: { id },
            data: {
                ...formattedData,
                images: finalImages as unknown as Prisma.InputJsonValue,
            },
            include: {
                category: true,
            },
        });
    }

    /**
     * Elimina archivos del servidor físico
     */
    private deletePhysicalFiles(imagePaths: string[]) {
        imagePaths.forEach((imagePath) => {
            try {
                if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                    return;
                }

                const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
                const fullPath = path.resolve(process.cwd(), cleanPath);

                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            } catch (error) {
                console.error(`Error al eliminar archivo físico: ${imagePath}`, error);
            }
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

    async getProductMetrics(): Promise<ProductMetricsResponse> {
        const [inventoryValueResult, lowStockResult, outOfStockProducts] = await Promise.all([
            // 1. Capital en Almacén
            this.prisma.$queryRaw<Array<{ total: number | null }>>`
                SELECT SUM(cost * currentStock) as total
                FROM products
                WHERE isActive = true
            `,

            // 2. Por Agotarse (0 < currentStock <= minimumStockAlert)
            this.prisma.$queryRaw<Array<{ count: number | bigint }>>`
                SELECT COUNT(*) as count
                FROM products
                WHERE isActive = true
                    AND currentStock > 0
                    AND currentStock <= minimumStockAlert
            `,

            // 3. Agotados Totalmente
            this.prisma.product.count({
                where: {
                    isActive: true,
                    currentStock: 0,
                },
            }),
        ]);

        return {
            inventoryValue: Number(inventoryValueResult[0]?.total ?? 0),
            lowStockProducts: Number(lowStockResult[0]?.count ?? 0),
            outOfStockProducts,
        };
    }
}