import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credit } from 'src/credit/entities/credit.entity';
import { PaymentDetail } from 'src/credit/entities/payment-detail.entity';
import { User } from 'src/user/entities/user.entity';
import { CreditHistory } from 'src/credit/entities/credit-history.entity';
import { SaleCredit } from 'src/sale-credit/entities/sale-credit.entity';
import { SaleCreditHistory } from 'src/sale-credit/entities/sale-credit-history.entity';
import { PaymentDetailSaleCredit } from 'src/sale-credit/entities/payment-detail-sale-credit.entity';
import { CreditTransaction } from 'src/cash/entities/credit-transaction.entity';
import { CreditTransactionDetail } from 'src/cash/entities/credit-transaction-detail.entity';
import { CashModule } from 'src/cash/cash.module';
import { Cash } from 'src/cash/entities/cash.entity';
import { Inventory } from 'src/product/enities/inventory';

@Module({
  imports:[TypeOrmModule.forFeature([Credit, PaymentDetail, User, CreditHistory, SaleCredit, SaleCreditHistory, PaymentDetailSaleCredit,
  CreditTransaction, CreditTransactionDetail, Cash, Inventory]), CashModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
