// src/uniforms/uniforms.controller.ts
import { BadRequestException, Controller, Get, Post, Body, UseInterceptors, UploadedFiles, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { UniformsService } from './uniforms.service';
import { CleanupOnErrorInterceptor } from './cleanup-on-error.interceptor';
import { GetUniformsFilterDto } from './dto/get-uniforms-filter.dto';
import { AssignUniformDto, UpdateAssignmentStatusDto } from './dto/assign-uniform.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('uniforms')
@UseGuards(JwtAuthGuard)
export class UniformsController {
    constructor(private readonly uniformsService: UniformsService) { }

    @Post()
    @UseInterceptors(
        FilesInterceptor('images', 10, { // Permite hasta 10 imágenes simultáneas
            storage: diskStorage({
                destination: './uploads/uniforms', // Asegúrate de crear esta carpeta en la raíz del backend
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `uniform-${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
                    return callback(new Error('Solo se permiten archivos de imagen (jpg, png, webp)'), false);
                }
                callback(null, true);
            },
        }),
        CleanupOnErrorInterceptor // 👈 🎯 SE AGREGA AQUÍ
    )
    async create(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() createUniformDto: any
    ) {
        const filePaths = files?.map(file => `/uploads/uniforms/${file.filename}`) || [];

        // Parse seguro contra fallos silenciosos de JSON
        if (createUniformDto.availableSizes) {
            try {
                if (typeof createUniformDto.availableSizes === 'string') {
                    createUniformDto.availableSizes = JSON.parse(createUniformDto.availableSizes);
                }
            } catch (e) {
                throw new BadRequestException('El formato de las tallas (availableSizes) es inválido.');
            }
        }

        return this.uniformsService.create({
            ...createUniformDto,
            images: filePaths, // Pasamos el array limpio al servicio
        });
    }

    @Get()
    async findAll(@Query() filters: GetUniformsFilterDto) {
        return this.uniformsService.findAll(filters);
    }

    @Get('count-by-status')
    async getCountByStatus() {
        return this.uniformsService.getCountByStatus();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.uniformsService.findOne(id);
    }

    @Patch(':id')
    @UseInterceptors(
        FilesInterceptor('images', 10, {
            storage: diskStorage({
                destination: './uploads/uniforms',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `uniform-${uniqueSuffix}${ext}`);
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
        @Body() updateUniformDto: any
    ) {
        const newFilePaths = files?.map(file => `/uploads/uniforms/${file.filename}`) || [];

        // Parse de availableSizes idéntico al del create
        if (updateUniformDto.availableSizes) {
            try {
                if (typeof updateUniformDto.availableSizes === 'string') {
                    updateUniformDto.availableSizes = JSON.parse(updateUniformDto.availableSizes);
                }
            } catch (e) {
                throw new BadRequestException('El formato de las tallas (availableSizes) es inválido.');
            }
        }

        // Parse de existingImages proveniente del frontend
        let existingImages: string[] = [];
        if (updateUniformDto.existingImages) {
            try {
                if (typeof updateUniformDto.existingImages === 'string') {
                    existingImages = JSON.parse(updateUniformDto.existingImages);
                } else if (Array.isArray(updateUniformDto.existingImages)) {
                    existingImages = updateUniformDto.existingImages;
                }
            } catch (e) {
                throw new BadRequestException('El formato de las imágenes existentes es inválido.');
            }
        }

        // Pasamos todo al servicio
        return this.uniformsService.update(id, {
            ...updateUniformDto,
            newImages: newFilePaths,
            existingImages,
        });
    }
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.uniformsService.remove(id);
    }

    // 🎯 Rutas de Asignación
    @Post(':id/assign')
    async assignToStudent(
        @Param('id') uniformId: string,
        @Body() assignUniformDto: AssignUniformDto,
    ) {
        return this.uniformsService.assignToStudent(uniformId, assignUniformDto);
    }

    @Patch('assignments/:assignmentId')
    async updateAssignmentStatus(
        @Param('assignmentId') assignmentId: string,
        @Body() updateAssignmentStatusDto: UpdateAssignmentStatusDto,
    ) {
        return this.uniformsService.updateAssignmentStatus(assignmentId, updateAssignmentStatusDto);
    }

}