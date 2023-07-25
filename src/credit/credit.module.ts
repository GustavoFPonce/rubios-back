import { Module } from '@nestjs/common';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credit } from './entities/credit.entity';
import { PaymentDetail } from './entities/payment-detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Credit, PaymentDetail])],
  controllers: [CreditController],
  providers: [CreditService]
})
export class CreditModule {}
