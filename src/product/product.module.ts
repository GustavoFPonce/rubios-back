import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from './enities/product.entity';

import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';

import { ProductController } from './product.controller';

import { ProductService } from './product.service';
import { CategoryModule } from 'src/category/category.module';
import { Inventory } from './enities/inventory';
import { Category } from 'src/category/entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Inventory, Category]),
    UserModule,
    AuthModule,
    RoleModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
