import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('product')
//@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Get()
  async findAll() {
    console.log("pidiendo productos");
    return this.productService.findAll();
  }

  @Get('category/:category')
  async findAllByCategory(
    @Param('category') category: string) {
    return this.productService.findAllByCategory(category);
  }


  @Get('search')
  async getByName(
    @Query('name') name: string
  ) {
    console.log("name: ", name);
    if (name) {
      return await this.productService.getByName(name);
    }
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string
  ) {
    return this.productService.findOne(id);
  }

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    console.log("product: ", createProductDto);
    return this.productService.create(createProductDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

}
