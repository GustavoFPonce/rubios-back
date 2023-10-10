import { Module } from '@nestjs/common';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleDetail } from './entities/sale-detail.entity';
import { Client } from 'src/client/entities/client.entity';
import { Product } from 'src/product/enities/product.entity';
import { Sale } from './entities/sale.entity';
import { ProductModule } from 'src/product/product.module';
import { SaleCreditModule } from 'src/sale-credit/sale-credit.module';
import { SaleCredit } from 'src/sale-credit/entities/sale-credit.entity';
import { Cash } from 'src/cash/entities/cash.entity';
import { CashModule } from 'src/cash/cash.module';

@Module({
  imports:[TypeOrmModule.forFeature([Sale, SaleDetail, Client, Product, SaleCredit, Cash]), ProductModule, SaleCreditModule, CashModule],
  controllers: [SaleController],
  providers: [SaleService]
})
export class SaleModule {}
