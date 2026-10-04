import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetProductsFilterDto } from './dto/get-products-filter.dto';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }
    @Get('featured')
    getFeaturedProducts() {
        return this.productsService.getFeaturedProducts();
    }

    @Post()
    @UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
    async create(
        @Body() createProductDto: CreateProductDto
    ) {
        return this.productsService.create(createProductDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
    async findAll(@Query() query: GetProductsFilterDto) {
        return this.productsService.findAll(query);
    }

    @Get('metrics')
    @UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
    getProductMetrics() {
        return this.productsService.getProductMetrics();
    }

    @Get('low-stock')
    @UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
    getLowStockAlerts() {
        return this.productsService.getLowStockAlerts();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
    async update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto, // o UpdateProductDto incluyendo existingImages
    ) {
        // Pasamos los datos al servicio
        return this.productsService.update(id, updateProductDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}