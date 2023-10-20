import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { InventoryCreateDto } from './dto/inventory-create-dto';

@Controller('product')
//@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Get()
  async findAll() {
    // console.log("pidiendo productos");
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

  

  @Get('product-name')
  async getProductName(
    @Query('product') id: number
  ){
    return await this.productService.getProductName(id);
  }

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    console.log("product: ", createProductDto);
    return this.productService.create(createProductDto);
  }

  @Put(':id/update-stock')
  async updateStock(
    @Param('id') id: number,
    @Query('stock') stock: string,
  ) {
    console.log("stock: ", stock);
    return this.productService.updateStock(id, parseInt(stock));
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    //console.log("producto a editar: ", updateProductDto);
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  @Get(':id/inventory')
  async getInventoryDetail(
    @Param('id') id: string
  ){
    console.log("pidiendo inventario: ", id);
    return await this.productService.getInventoryDetail(id);
  }

  @Post(':id/inventory')
  async addInventory(
    @Param('id') id: string,
    @Body() inventory: any
  ){
    return await this.productService.addInventory(inventory, id);
  }

  @Get(':id/inventory-by-date')
  async getInventoryByDate(
    @Param('id') id: number,
    @Query('start') start: Date,
    @Query('end') end: Date
  ){
    return await this.productService.getInventoryByDate(id, start, end);
  }

  
  @Get(':id')
  async findOne(
    @Param('id') id: string
  ) {
    return this.productService.findOne(id);
  }

}
