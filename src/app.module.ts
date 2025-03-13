import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';
import { TokenModule } from './token/token.module';
import { StripeModule } from 'nestjs-stripe';
import { CreditModule } from './credit/credit.module';
import { ClientModule } from './client/client.module';
import { join } from 'path';
import { CategoryModule } from './category/category.module';
import { ReportModule } from './report/report.module';
import { SaleModule } from './sale/sale.module';
import { SaleCreditModule } from './sale-credit/sale-credit.module';
import { CashModule } from './cash/cash.module';

const rubios: any = {
  type: 'mysql',
  host: '',
  port: 3306,
  username: '',
  password: '',
  database: '',
  autoLoadEntities: true,
  synchronize: false,
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
}

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(rubios),
    UserModule,
    ProductModule,
    RoleModule,
    AuthModule,
    TokenModule,
    CreditModule,
    ClientModule,
    CategoryModule,
    ReportModule,
    SaleModule,
    SaleCreditModule,
    CashModule,
  ],
})
export class AppModule { }
