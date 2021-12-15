import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Product } from './product.entity';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll() {
    const products = await this.productRepository.find();

    return products;
  }

  async findAllByCategoty(category: string) {
    const products = await this.productRepository.findOne({ category });

    return products;
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne(id);

    if (!product) {
      throw new NotFoundException(`There is no user under id ${id}`);
    }

    return product;
  }

  async create(createProductDto: CreateProductDto) {
    const id = uuidv4();

    const product = await this.productRepository.create({
      id,
      ...createProductDto,
    });

    return this.productRepository.save(product);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const product = await this.productRepository.preload({
      id,
      ...updateUserDto,
    });

    if (!product) {
      throw new NotFoundException(`There is no product under id ${id}`);
    }

    return this.productRepository.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    return this.productRepository.remove(product);
  }
}
