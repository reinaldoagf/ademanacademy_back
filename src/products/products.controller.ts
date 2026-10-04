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
import { GetProductsFilterDto } from './dto/get-products-filter.dto';

@Controller('products')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }
    @Post()
    async create(
        @Body() createProductDto: CreateProductDto
    ) {
        return this.productsService.create(createProductDto);
    }

    @Get()
    async findAll(@Query() query: GetProductsFilterDto) {
        return this.productsService.findAll(query);
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
    async update(
        @Param('id') id: string,
        @Body() updateProductDto: any, // o UpdateProductDto incluyendo existingImages
    ) {
        // Pasamos los datos al servicio
        return this.productsService.update(id, updateProductDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}