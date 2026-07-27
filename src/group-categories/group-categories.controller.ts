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
import { GroupCategoriesService } from './group-categories.service';
import { CreateGroupCategoryDto } from './dto/create-group-category.dto';
import { UpdateGroupCategoryDto } from './dto/update-group-category.dto';
import { GetGroupCategoriesFilterDto } from './dto/get-group-categories-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('group-categories')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class GroupCategoriesController {
    constructor(private readonly groupCategoriesService: GroupCategoriesService) { }

    @Post()
    create(@Body() createGroupCategoryDto: CreateGroupCategoryDto) {
        return this.groupCategoriesService.create(createGroupCategoryDto);
    }

    @Get()
    async findAll(@Query() filters: GetGroupCategoriesFilterDto) {
        return this.groupCategoriesService.findAll(filters);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.groupCategoriesService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateGroupCategoryDto: UpdateGroupCategoryDto
    ) {
        return this.groupCategoriesService.update(id, updateGroupCategoryDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.groupCategoriesService.remove(id);
    }
}