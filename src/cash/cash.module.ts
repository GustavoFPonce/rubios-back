import { Module } from '@nestjs/common';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cash } from './entities/cash.entity';
import { Revenue } from './entities/revenue.entity';
import { Expense } from './entities/expense.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cash, Revenue, Expense, CreditTransaction, User])],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
