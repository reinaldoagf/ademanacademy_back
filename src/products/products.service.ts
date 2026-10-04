import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsFilterDto, StockFilterEnum } from './dto/get-products-filter.dto';
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
    constructor(private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,) { }

    async create(createProductDto: CreateProductDto) {
        const existingProduct = await this.prisma.product.findUnique({
            where: { name: createProductDto.name },
        });

        if (existingProduct) {
            throw new ConflictException(`El producto con el nombre "${createProductDto.name}" ya existe.`);
        }

        const { images, categoryId, ...data } = createProductDto;

        return this.prisma.product.create({
            data: {
                ...data,
                categoryId: categoryId?.length ? categoryId : null,
                images: images?.length
                    ? {
                        create: images.map((img, idx) => ({
                            url: img.url,
                            key: img.key,
                            altText: img.altText || createProductDto.name,
                            type: idx === 0 ? 'cover' : 'gallery',
                            order: idx,
                        })),
                    }
                    : undefined,
            },
            include: {
                category: true,
            },
        });
    }

    async findAll(params?: GetProductsFilterDto) {
        const { page = 1, limit = 10, search, categoryId, isActive, stockStatus } = params || {};
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

        // Filtro por estado activo/inactivo
        if (typeof isActive === 'boolean') {
            where.isActive = isActive;
        }

        // 🎯 Filtro por Stock
        if (stockStatus === StockFilterEnum.IN_STOCK) {
            where.currentStock = { gt: 0 };
        } else if (stockStatus === StockFilterEnum.OUT_OF_STOCK) {
            where.currentStock = { lte: 0 };
        }

        const [totalItems, data] = await Promise.all([
            this.prisma.product.count({ where }),
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    images: true,
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
                images: true,
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
        updateProductDto: UpdateProductDto,
    ) {
        // 1. Obtener el producto actual de la base de datos
        const currentProduct = await this.prisma.product.findUnique({
            where: { id },
            include: { images: true },
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


        const { images, categoryId, ...data } = updateProductDto;
        // 🎯 Limpieza de imágenes eliminadas en S3 y BD
        if (images) {
            const newKeys = images.map((img) => img.key);
            const imagesToDelete = currentProduct.images.filter((img) => !newKeys.includes(img.key));

            // 1. Borrar de S3
            await Promise.all(imagesToDelete.map((img) => this.s3Service.deleteFile(img.key)));

            // 2. Limpiar registros anteriores de imágenes en BD para este evento
            await this.prisma.productImage.deleteMany({
                where: { productId: id },
            });
        }
        // 8. Actualizar en la BD
        return this.prisma.product.update({
            where: { id },
            data: {
                ...data,
                categoryId: categoryId?.length ? categoryId : currentProduct.categoryId,
                images: images?.length
                    ? {
                        create: images.map((img, idx) => ({
                            url: img.url,
                            key: img.key,
                            altText: img.altText || updateProductDto.name || currentProduct.name,
                            type: img.type || (idx === 0 ? 'cover' : 'gallery'),
                            order: img.order ?? idx,
                        })),
                    }
                    : undefined,
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

    async getFeaturedProducts() {
        try {
            const products = await this.prisma.product.findMany({
                where: {
                    featured: true,
                    isActive: true,
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    images: {
                        orderBy: [
                            { type: 'asc' },  // Coloca 'cover' antes que 'gallery' alfabéticamente
                            { order: 'asc' }, // Orden numérico
                        ],
                    },
                },
                orderBy: {
                    updatedAt: 'desc',
                },
                take: 10, // Límite de productos en el carrusel
            });

            // Convertimos los Decimale de Prisma a Number para evitar problemas de serialización en Next.js Client Components
            return products.map((product) => ({
                ...product,
                salePrice: Number(product.salePrice),
                cost: Number(product.cost),
            }));
        } catch (error) {
            console.error('Error al obtener productos destacados:', error);
            return [];
        }
    }
}