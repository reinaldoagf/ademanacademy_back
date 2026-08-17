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
    UploadedFiles
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
        const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
        return this.productsService.findAll({ page, limit, search, categoryId, isActive: activeBool });
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
    update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
        return this.productsService.update(id, updateProductDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}