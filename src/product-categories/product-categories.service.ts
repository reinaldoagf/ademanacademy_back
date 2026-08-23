import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Ajusta la ruta a tu PrismaService
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { GetProductCategoriesFilterDto } from './dto/get-product-categories-filter.dto';


@Injectable()
export class ProductCategoriesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createDto: CreateProductCategoryDto) {


        // Verificar si ya existe una categoría con el mismo nombre
        const existing = await this.prisma.productCategory.findUnique({
            where: { name: createDto.name },
        });

        if (existing) {
            throw new ConflictException(`Ya existe una categoría con el nombre '${createDto.name}'`);
        }

        return this.prisma.productCategory.create({
            data: createDto,
        });
    }

    async findAll(filters: GetProductCategoriesFilterDto) {
        const { page = 1, limit = 10, search } = filters;
        const skip = (page - 1) * limit;

        // Construcción de condiciones dinámicas de búsqueda
        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search } },
            ];
        }

        // Ejecutar consultas en paralelo para optimizar rendimiento en BD
        const [totalItems, data] = await Promise.all([
            this.prisma.productCategory.count({ where }),
            this.prisma.productCategory.findMany({
                where,
                skip,
                take: limit,
                include: {
                    products: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        return {
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            },
            data,
        };
    }

    async findOne(id: string) {
        const category = await this.prisma.productCategory.findUnique({
            where: { id },
        });

        if (!category) {
            throw new NotFoundException(`Categoría con ID '${id}' no encontrada`);
        }

        return category;
    }

    async update(id: string, updateDto: UpdateProductCategoryDto) {
        const category = await this.findOne(id);
        // Si se intenta cambiar el nombre, verificar que no esté duplicado
        if (updateDto.name && updateDto.name !== category.name) {
            const existing = await this.prisma.productCategory.findUnique({
                where: { name: updateDto.name },
            });

            if (existing) {
                throw new ConflictException(`Ya existe una categoría con el nombre '${updateDto.name}'`);
            }
        }

        return this.prisma.productCategory.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Verifica si existe antes de eliminar

        return this.prisma.productCategory.delete({
            where: { id },
        });
    }
}