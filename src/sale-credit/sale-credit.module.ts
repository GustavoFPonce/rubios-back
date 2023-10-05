import { Module } from '@nestjs/common';
import { SaleCreditController } from './sale-credit.controller';
import { SaleCreditService } from './sale-credit.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleCredit } from './entities/sale-credit.entity';
import { PaymentDetailSaleCredit } from './entities/payment-detail-sale-credit.entity';
import { SaleCreditHistory } from './entities/sale-credit-history.entity';
import { Client } from 'src/client/entities/client.entity';
import { User } from 'src/user/entities/user.entity';
import { Cash } from 'src/cash/entities/cash.entity';
import { CashModule } from 'src/cash/cash.module';
import { CreditTransactionDetail } from 'src/cash/entities/credit-transaction-detail.entity';
import { CreditTransaction } from 'src/cash/entities/credit-transaction.entity';

@Module({
  imports:[TypeOrmModule.forFeature([SaleCredit, SaleCreditHistory, PaymentDetailSaleCredit, Client, User, Cash, CreditTransactionDetail, CreditTransaction]), CashModule],
  controllers: [SaleCreditController],
  providers: [SaleCreditService],
  exports:[SaleCreditService]
})
export class SaleCreditModule {}
