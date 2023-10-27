import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { Permission } from './entities/permission.entity';

import { RoleModule } from '../role/role.module';

import { UserService } from './user.service';
import { UserController } from './user.controller';
import { Credit } from 'src/credit/entities/credit.entity';
import { SaleCredit } from 'src/sale-credit/entities/sale-credit.entity';
import { Client } from 'src/client/entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Permission, Credit, SaleCredit, Client]), RoleModule],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
