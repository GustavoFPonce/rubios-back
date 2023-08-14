import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Brackets, Like, Repository } from 'typeorm';
import { CategoryCreateDto } from './dto/category-create-dto';
import { CategoryEditDto } from './dto/category-edit-dto';
import { ProductService } from 'src/product/product.service';

@Injectable()
export class CategoryService {

    constructor(
        @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
       // private readonly productService: ProductService
    ) { }

    async getAll() {
        return this.categoryRepository.find();
    }

    async getByName(name: string) {
        const categories = await this.categoryRepository.find({ where: [{ name: Like(`%${name}%`) }] });
        console.log("categorias: ", categories);
        return categories;

    }

    async delete(id: number) {
        var response = { success: false };
        const responseDelete = await this.categoryRepository.delete(id);
        console.log("response delete: ", responseDelete);
        if (responseDelete.affected != 0) response.success = true;
        return response;
    }

    async create(categoryCreate: CategoryCreateDto) {
        const response = { success: false };
        const category = this.categoryRepository.create(categoryCreate)
        const savedCategory = await this.categoryRepository.save(category);
        console.log("saved category: ", savedCategory);
        if (savedCategory) response.success = true;
        return response;
    }

    async update(id: number, category: CategoryEditDto) {
        console.log("id: ", id);
        console.log("category: ", category);
        var response = { success: false };
        var categorySaved = await this.categoryRepository.findOne(id);
        if (categorySaved) {
            categorySaved.name = category.name;
            const responseUpdate = await this.categoryRepository.save(categorySaved);
            console.log("response update: ", responseUpdate);
            if (responseUpdate) response.success = true;
        }
        return response;
    }

    async getById(id: number) {
        return this.categoryRepository.findOne(id);
    }

    // async getProducts(id: number) {
    //     return await this.productService.getByCategory(id);

    // }
}
