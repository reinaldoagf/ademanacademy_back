// src/costumes/costumes.controller.ts
import { BadRequestException, Controller, Get, Post, Body, UseInterceptors, UploadedFiles, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CostumesService } from './costumes.service';
import { CreateCostumeDto } from './dto/create-costume.dto';
import { UpdateCostumeDto } from './dto/update-costume.dto';
import { GetCostumesFilterDto } from './dto/get-costumes-filter.dto';
import { AssignCostumeDto, UpdateAssignmentStatusDto } from './dto/assign-costume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('costumes')
@UseGuards(JwtAuthGuard)
export class CostumesController {
    constructor(private readonly costumesService: CostumesService) { }

    @Post()
    @UseInterceptors(
        FilesInterceptor('images', 10, { // Permite hasta 10 imágenes simultáneas
            storage: diskStorage({
                destination: './uploads/costumes', // Asegúrate de crear esta carpeta en la raíz del backend
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `costume-${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
                    return callback(new Error('Solo se permiten archivos de imagen (jpg, png, webp)'), false);
                }
                callback(null, true);
            },
        }),
    )
    async create(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() createCostumeDto: any
    ) {
        const filePaths = files?.map(file => `/uploads/costumes/${file.filename}`) || [];

        // Parse seguro contra fallos silenciosos de JSON
        if (createCostumeDto.availableSizes) {
            try {
                if (typeof createCostumeDto.availableSizes === 'string') {
                    createCostumeDto.availableSizes = JSON.parse(createCostumeDto.availableSizes);
                }
            } catch (e) {
                throw new BadRequestException('El formato de las tallas (availableSizes) es inválido.');
            }
        }

        return this.costumesService.create({
            ...createCostumeDto,
            images: filePaths, // Pasamos el array limpio al servicio
        });
    }

    @Get()
    async findAll(@Query() filters: GetCostumesFilterDto) {
        return this.costumesService.findAll(filters);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.costumesService.findOne(id);
    }

    @Patch(':id')
    @UseInterceptors(
        FilesInterceptor('images', 10, {
            storage: diskStorage({
                destination: './uploads/costumes',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `costume-${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
                    return callback(new Error('Solo se permiten archivos de imagen (jpg, png, webp)'), false);
                }
                callback(null, true);
            },
        }),
    )
    async update(
        @Param('id') id: string,
        @UploadedFiles() files: Express.Multer.File[],
        @Body() updateCostumeDto: any
    ) {
        const newFilePaths = files?.map(file => `/uploads/costumes/${file.filename}`) || [];

        // Parse de availableSizes idéntico al del create
        if (updateCostumeDto.availableSizes) {
            try {
                if (typeof updateCostumeDto.availableSizes === 'string') {
                    updateCostumeDto.availableSizes = JSON.parse(updateCostumeDto.availableSizes);
                }
            } catch (e) {
                throw new BadRequestException('El formato de las tallas (availableSizes) es inválido.');
            }
        }

        // Parse de existingImages proveniente del frontend
        let existingImages: string[] = [];
        if (updateCostumeDto.existingImages) {
            try {
                if (typeof updateCostumeDto.existingImages === 'string') {
                    existingImages = JSON.parse(updateCostumeDto.existingImages);
                } else if (Array.isArray(updateCostumeDto.existingImages)) {
                    existingImages = updateCostumeDto.existingImages;
                }
            } catch (e) {
                throw new BadRequestException('El formato de las imágenes existentes es inválido.');
            }
        }

        // Pasamos todo al servicio
        return this.costumesService.update(id, {
            ...updateCostumeDto,
            newImages: newFilePaths,
            existingImages,
        });
    }
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.costumesService.remove(id);
    }

    // 🎯 Rutas de Asignación
    @Post(':id/assign')
    async assignToStudent(
        @Param('id') costumeId: string,
        @Body() assignCostumeDto: AssignCostumeDto,
    ) {
        return this.costumesService.assignToStudent(costumeId, assignCostumeDto);
    }

    @Patch('assignments/:assignmentId')
    async updateAssignmentStatus(
        @Param('assignmentId') assignmentId: string,
        @Body() updateAssignmentStatusDto: UpdateAssignmentStatusDto,
    ) {
        return this.costumesService.updateAssignmentStatus(assignmentId, updateAssignmentStatusDto);
    }
}