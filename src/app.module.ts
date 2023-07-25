import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { ProductModule } from './product/product.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';
import { TokenModule } from './token/token.module';
import { StripeModule } from 'nestjs-stripe';
import { CreditModule } from './credit/credit.module';
import { ClientModule } from './client/client.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',      
      host: 'MYSQL5048.site4now.net',
      port: 3306,
      username: 'a7f37d_rubios',
      password: 'Abcd1234',
      database: 'db_a7f37d_rubios',
      autoLoadEntities: true,
      synchronize: false,
      entities: [join(__dirname, '**', '*.entity.{ts,js}')],
    }),
    StripeModule.forRoot({
      apiKey: process.env.STRIPE_API_KEY,
      apiVersion: '2020-08-27',
    }),
    UserModule,
    OrderModule,
    ProductModule,
    RoleModule,
    AuthModule,
    TokenModule,
    CreditModule,
    ClientModule,
  ],
})
export class AppModule {}
