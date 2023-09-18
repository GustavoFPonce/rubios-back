import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CategoryCreateDto } from './dto/category-create-dto';
import { Category } from './entities/category.entity';
import { CategoryEditDto } from './dto/category-edit-dto';

@Controller('category')
@UseGuards(JwtAuthGuard)
export class CategoryController {

    constructor(private readonly categoryService: CategoryService) { }

    @Get()
    async getAll() {
        return await this.categoryService.getAll();
    }

    @Get('by-name')
    async getByName(
        @Query('name') name: number
    ) {
        console.log("name catgeoría: ", name);
        return await this.categoryService.getByName(name);
    }

    @Delete(':id')
    async delete(
        @Param('id') id: number
    ) {
        return await this.categoryService.delete(id);
    }

    @Post()
    async create(
        @Body() category: CategoryCreateDto
    ) {
        // console.log("category: ", category);
        return await this.categoryService.create(category);
    }

    @Put(':id')
    async update(
        @Param('id') id: number,
        @Body() category: CategoryEditDto
    ) {
        console.log("id controller: ", id);
        return await this.categoryService.update(id, category);
    }

    @Get(':id/products')
    async getProducts(
        @Param('id') id: number
    ) {
        console.log("id recibido: ", id);
        return await this.categoryService.getProducts(id);
    }

    @Get(':id')
    async getById(
        @Param('id') id: number
    ){
       console.log("id: ", id);
        return await this.categoryService.getById(id);
    }
}
