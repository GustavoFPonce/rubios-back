import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credit } from 'src/credit/entities/credit.entity';
import { PaymentDetail } from 'src/credit/entities/payment-detail.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Credit, PaymentDetail])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
