import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    ParseIntPipe,
    DefaultValuePipe,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
    BadRequestException
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CleanupOnErrorInterceptor } from './cleanup-on-error.interceptor';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('products')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }
    @Post()
    @UseInterceptors(
        FilesInterceptor('images', 10, { // Permite hasta 10 imágenes simultáneas
            storage: diskStorage({
                destination: './uploads/products', // Asegúrate de crear esta carpeta en la raíz del backend
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `product-${uniqueSuffix}${ext}`);
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
        @Body() createProductDto: CreateProductDto
    ) {
        const filePaths = files?.map(file => `/uploads/products/${file.filename}`) || [];

        return this.productsService.create({
            ...createProductDto,
            images: filePaths, // Pasamos el array limpio al servicio
        });
    }

    @Get()
    findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('search') search?: string,
        @Query('categoryId') categoryId?: string,
        @Query('isActive') isActive?: string,
    ) {
        let activeBool: boolean | undefined = undefined;

        if (isActive === 'true') {
            activeBool = true;
        } else if (isActive === 'false') {
            activeBool = false;
        }

        return this.productsService.findAll({
            page,
            limit,
            search,
            categoryId,
            isActive: activeBool
        });
    }

    @Get('metrics')
    getProductMetrics() {
        return this.productsService.getProductMetrics();
    }

    @Get('low-stock')
    getLowStockAlerts() {
        return this.productsService.getLowStockAlerts();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Patch(':id')
    @UseInterceptors(
        FilesInterceptor('images', 10, {
            storage: diskStorage({
                destination: './uploads/products',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `product-${uniqueSuffix}${ext}`);
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
        @Body() updateProductDto: any, // o UpdateProductDto incluyendo existingImages
    ) {
        const newFilePaths = files?.map(file => `/uploads/products/${file.filename}`) || [];

        // Parse de existingImages proveniente del FormData
        let existingImages: string[] = [];
        if (updateProductDto.existingImages) {
            try {
                if (typeof updateProductDto.existingImages === 'string') {
                    existingImages = JSON.parse(updateProductDto.existingImages);
                } else if (Array.isArray(updateProductDto.existingImages)) {
                    existingImages = updateProductDto.existingImages;
                }
            } catch (e) {
                throw new BadRequestException('El formato de las imágenes existentes es inválido.');
            }
        }

        // Pasamos los datos al servicio
        return this.productsService.update(id, updateProductDto, existingImages, newFilePaths);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}