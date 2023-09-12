import { Module } from '@nestjs/common';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleDetail } from './entities/sale-detail.entity';
import { Client } from 'src/client/entities/client.entity';
import { Product } from 'src/product/enities/product.entity';
import { Sale } from './entities/sale.entity';
import { ProductModule } from 'src/product/product.module';

@Module({
  imports:[TypeOrmModule.forFeature([Sale, SaleDetail, Client, Product]), ProductModule],
  controllers: [SaleController],
  providers: [SaleService]
})
export class SaleModule {}
