import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Like, Repository } from 'typeorm';

import { Product } from './enities/product.entity';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from 'src/category/entities/category.entity';
import { CategoryService } from 'src/category/category.service';
import { ProductDto } from './dto/product-dto';
import { InventoryCreateDto } from './dto/inventory-create-dto';
import { Inventory } from './enities/inventory';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    private readonly categoryService: CategoryService
  ) { }

  async findAll() {
    const products = await this.productRepository.find({ relations: ['category', 'inventories'] });
    console.log("products: ", products);
    const productsDto = products.map((product) => {
      return new ProductDto(product);
    })
    console.log("productsDto: ", productsDto);
    return productsDto;
    //return null;
  }

  async findAllByCategory(category: string) {
    //const products = await this.productRepository.findOne({ category });

    //return products;
    return null
  }

  async findManyByIds(arrayOfIds: Array<string>) {
    const products = await this.productRepository
      .createQueryBuilder()
      .where('id IN(:...arrayOfIds)', { arrayOfIds })
      .getMany();

    return products;
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne(id);

    if (!product) {
      throw new NotFoundException(`There is no product under id ${id}`);
    }

    return product;
  }

  async create(createProductDto: CreateProductDto) {
    var response = { success: false, message: '' };
    const existCode = await this.existCodeProduct(createProductDto.code);
    if (!existCode) {
      const category = await this.categoryService.getById(createProductDto.categoryId);
      var newProduct = new Product();
      newProduct.code = createProductDto.code,
        newProduct.name = createProductDto.name,
        newProduct.category = category,
        newProduct.description = createProductDto.description,
        newProduct.price = createProductDto.price
      const product = this.productRepository.create(newProduct);
      const responseProduct = await this.productRepository.save(product);
      console.log("responseProduct: ", responseProduct);
      const newInventory: InventoryCreateDto = {
        amount: createProductDto.stock,
        costPesos: createProductDto.costPesos,
        costDollar: createProductDto.costDollar
      }
      if (responseProduct) {
        const responseInventory = await this.addInventory(newInventory, responseProduct.id);
        if (responseInventory.success) response.success = true;
      } else {
        response.message = 'Ya existe el código asociado a un producto.'
      }
      return response;
    }
  }

  async addInventory(inventoryCreate: InventoryCreateDto, productId: string) {
    var response = { success: false };
    const product = await this.findOne(productId);
    var newInventory = new Inventory();
    newInventory.date = new Date();
    newInventory.amount = inventoryCreate.amount;
    newInventory.costPesos = inventoryCreate.costPesos;
    newInventory.costDollar = inventoryCreate.costDollar;
    newInventory.product = product;
    const inventory = this.inventoryRepository.create(newInventory);
    const inventoryResponse = await this.inventoryRepository.save(inventory);
    if (inventoryResponse) response.success = true;
    return response;

  }

  private async existCodeProduct(code: string) {
    const product = await this.productRepository.findOne({ code });
    if (product) {
      return true;
    } else {
      return false;
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    // const product = await this.productRepository.preload({
    //   id,
    //   ...updateProductDto,
    // });

    // if (!product) {
    //   throw new NotFoundException(`There is no product under id ${id}`);
    // }

    // return this.productRepository.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    return this.productRepository.remove(product);
  }

  async getByName(name: string) {
    const products = await this.productRepository.find({ where: [{ name: Like(`%${name}%`) }], relations: ['category', 'inventories'] });
    console.log("products: ", products);
    const productsDto = products.map((product) => {
      return new ProductDto(product);
    });
    return productsDto;
  }

  async getByCategory(id: number) {
    const products = await this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.inventories', 'inventory')
      .where('product.category = :id', { id })
      .getMany();
    console.log("productos filtrados por categoría1: ", products);
    const productsDto = products.map(x => {
      return new ProductDto(x);
    });
    return productsDto;
  }
}
