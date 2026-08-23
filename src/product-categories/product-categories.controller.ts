import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    Delete,
    ParseUUIDPipe,
    UseGuards
} from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { GetProductCategoriesFilterDto } from './dto/get-product-categories-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('product-categories')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class ProductCategoriesController {
    constructor(private readonly ProductCategoriesService: ProductCategoriesService) { }

    @Post()
    create(@Body() CreateProductCategoryDto: CreateProductCategoryDto) {
        return this.ProductCategoriesService.create(CreateProductCategoryDto);
    }

    @Get()
    async findAll(@Query() filters: GetProductCategoriesFilterDto) {
        return this.ProductCategoriesService.findAll(filters);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.ProductCategoriesService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() UpdateProductCategoryDto: UpdateProductCategoryDto
    ) {
        return this.ProductCategoriesService.update(id, UpdateProductCategoryDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.ProductCategoriesService.remove(id);
    }
}