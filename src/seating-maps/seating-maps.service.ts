import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Ajusta la ruta a tu PrismaService
import { CreateSeatingMapDto } from './dto/create-seating-map.dto';
import { UpdateSeatingMapDto } from './dto/update-seating-map.dto';
import { GetSeatingMapsFilterDto } from './dto/get-seating-maps-filter.dto';

@Injectable()
export class SeatingMapsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createDto: CreateSeatingMapDto) {
        const { elements, ...mapData } = createDto;

        console.log({ createDto })

        return this.prisma.seatingMap.create({
            data: {
                ...mapData,
                elements: {
                    create: elements,
                },
            },
            include: {
                elements: true,
            },
        });
    }


    async findAll(filters: GetSeatingMapsFilterDto) {
        const { page = 1, limit = 10, search } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            where.OR = [
                { location: { contains: search } },
            ];
        }

        const [totalItems, data] = await Promise.all([
            this.prisma.seatingMap.count({ where }),
            this.prisma.seatingMap.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    elements: true
                }
            }),
        ]);


        return {
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
            },
            data,
        };
    }

    async findOne(id: string) {
        const seatingMap = await this.prisma.seatingMap.findUnique({
            where: { id },
            include: {
                elements: true,
            },
        });

        if (!seatingMap) {
            throw new NotFoundException(`Mapa de asientos con ID "${id}" no encontrado`);
        }

        return seatingMap;
    }

    async update(id: string, updateDto: UpdateSeatingMapDto) {
        await this.findOne(id); // Verifica existencia

        const { elements, ...mapData } = updateDto;

        return this.prisma.seatingMap.update({
            where: { id },
            data: {
                ...mapData,
                ...(elements && {
                    elements: {
                        deleteMany: {}, // 👈 Elimina los elementos anteriores asociados
                        create: elements, // 👈 Crea el nuevo set de elementos
                    },
                }),
            },
            include: {
                elements: true,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.seatingMap.delete({
            where: { id },
        });
    }
}