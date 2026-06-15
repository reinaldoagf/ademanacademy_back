import { Controller, Get, Post, Body, UsePipes, Param, Delete, Query, UseGuards, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GetGroupsFilterDto } from './dto/get-groups-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGroupDto } from '@/groups/dto/create-group.dto';

@Controller('groups')
@UseGuards(JwtAuthGuard) // 🛡️ Protege la gestión de infraestructura
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    async create(@Body() createGroupDto: CreateGroupDto) {
        return await this.groupsService.create(createGroupDto);
    }

    @Get()
    async findAll(@Query() filters: GetGroupsFilterDto) {
        return this.groupsService.findAll(filters);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.groupsService.findOne(id);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.groupsService.remove(id);
    }
}