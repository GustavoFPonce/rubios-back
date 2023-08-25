import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Between, Like, Repository } from 'typeorm';

import { Product } from './enities/product.entity';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from 'src/category/entities/category.entity';
import { CategoryService } from 'src/category/category.service';
import { ProductDto } from './dto/product-dto';
import { InventoryCreateDto } from './dto/inventory-create-dto';
import { Inventory } from './enities/inventory';
import { InventoryListDto } from './dto/inventory-list-dto';
import { getDateStartEnd } from 'src/common/get-date-start-end';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) { }

  async findAll() {
    const products = await this.productRepository.find({ relations: ['category', 'inventories'] });
    // console.log("products: ", products);
    const productsDto = products.map((product) => {
      return new ProductDto(product);
    })
    //console.log("productsDto: ", productsDto);
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
    console.log("id product: ", id);
    const product = await this.productRepository.findOne({ where: { id: id }, relations: ['inventories', 'category'] });

    if (!product) {
      throw new NotFoundException(`There is no product under id ${id}`);
    }
    console.log("producto obtenido: ", product);
    return new ProductDto(product);
  }

  async create(createProductDto: CreateProductDto) {
    var response = { success: false, message: '' };
    const existCode = await this.existCodeProduct(createProductDto.code);
    if (!existCode) {
      const category = await this.categoryRepository.findOne(createProductDto.categoryId);
      var newProduct = new Product();
      newProduct.code = createProductDto.code;
      newProduct.name = createProductDto.name;
      newProduct.category = category;
      newProduct.description = createProductDto.description;
      newProduct.pricePesos = createProductDto.pricePesos;
      newProduct.priceDollar = createProductDto.priceDollar;
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
    const product = await this.productRepository.findOne(productId);
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
    console.log("id: ", id);
    var response = { success: false };
    var product = await this.productRepository.findOne(id);
    const category = await this.categoryRepository.findOne(updateProductDto.categoryId);
    console.log("producto encontrado: ", product);
    if (!product) {
      throw new NotFoundException(`No existe le producto con el id: ${id}`);
    }
    product.code = updateProductDto.code;
    product.description = updateProductDto.description;
    product.name = updateProductDto.name;
    product.pricePesos = updateProductDto.pricePesos;
    product.priceDollar = updateProductDto.priceDollar;
    product.category = category;
    const responseUpdate = await this.productRepository.save(product);
    console.log("responseUpdate: ", responseUpdate);
    if (responseUpdate) response.success = true;
    return response;
  }

  async remove(id: string) {
    var response = { success: false }
    const responseDelete = await this.productRepository.delete(id);
    if (responseDelete.affected > 0) response.success = true;
    return response;
  }

  async getByName(name: string) {
    const products = await this.productRepository.find({ where: [{ name: Like(`%${name}%`) }], relations: ['category', 'inventories'] });
    // console.log("products: ", products);
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

  async getInventoryDetail(id: string) {
    const product = await this.productRepository.findOne({ where: { id: id }, relations: ['inventories'] });
    const inventories = product.inventories.sort((a, b) => {
      if (a.date.getTime() !== b.date.getTime()) {
        return b.date.getTime() - a.date.getTime();
      }
      return parseInt(b.id) - parseInt(a.id);
    });
    return inventories.map((x) => {
      return new InventoryListDto(x);
    });

  }

  async getInventoryByDate(id: number, start: Date, end: Date) {
    const startDate = getDateStartEnd(start, end).startDate;
    const endDate = getDateStartEnd(start, end).endDate;
    const inventories = await this.inventoryRepository.find(
      {
        where: {
          product: { id: id },
          date: Between(startDate, endDate)
        },
        order: {
          date: 'DESC',
          id: 'DESC'
        }
      },
    );

    return inventories.map((x) => {
      return new InventoryListDto(x);
    })

  }
}
