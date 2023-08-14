import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from 'src/product/product.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), 
  //ProductModule
],
  controllers: [CategoryController],
  exports: [CategoryService],
  providers: [CategoryService]
})
export class CategoryModule {}
