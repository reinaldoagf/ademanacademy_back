import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Ajusta la ruta a tu PrismaService
import { CreateGroupCategoryDto } from './dto/create-group-category.dto';
import { UpdateGroupCategoryDto } from './dto/update-group-category.dto';
import { GetGroupCategoriesFilterDto } from './dto/get-group-categories-filter.dto';


@Injectable()
export class GroupCategoriesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createDto: CreateGroupCategoryDto) {
        // Validar edades
        if (createDto.minimumAge > createDto.maximumAge) {
            throw new BadRequestException('La edad mínima no puede ser mayor que la edad máxima.');
        }

        // Verificar si ya existe una categoría con el mismo nombre
        const existing = await this.prisma.groupCategory.findUnique({
            where: { name: createDto.name },
        });

        if (existing) {
            throw new ConflictException(`Ya existe una categoría con el nombre '${createDto.name}'`);
        }

        return this.prisma.groupCategory.create({
            data: createDto,
        });
    }

    async findAll(filters: GetGroupCategoriesFilterDto) {
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
            this.prisma.groupCategory.count({ where }),
            this.prisma.groupCategory.findMany({
                where,
                skip,
                take: limit,
                include: {
                    groups: {
                        include: {
                            students: true,
                            schedules: {
                                include: {
                                    group: true,
                                },
                            },
                        },
                    },
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
        const category = await this.prisma.groupCategory.findUnique({
            where: { id },
        });

        if (!category) {
            throw new NotFoundException(`Categoría con ID '${id}' no encontrada`);
        }

        return category;
    }

    async update(id: string, updateDto: UpdateGroupCategoryDto) {
        const category = await this.findOne(id);

        // Si viene actualización de edades, validar que minimumAge <= maximumAge
        const minAge = updateDto.minimumAge ?? category.minimumAge;
        const maxAge = updateDto.maximumAge ?? category.maximumAge;

        if (minAge > maxAge) {
            throw new BadRequestException('La edad mínima no puede ser mayor que la edad máxima.');
        }

        // Si se intenta cambiar el nombre, verificar que no esté duplicado
        if (updateDto.name && updateDto.name !== category.name) {
            const existing = await this.prisma.groupCategory.findUnique({
                where: { name: updateDto.name },
            });

            if (existing) {
                throw new ConflictException(`Ya existe una categoría con el nombre '${updateDto.name}'`);
            }
        }

        return this.prisma.groupCategory.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Verifica si existe antes de eliminar

        return this.prisma.groupCategory.delete({
            where: { id },
        });
    }
}