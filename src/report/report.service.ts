import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getDateStartEnd } from 'src/common/get-date-start-end';
import { Credit } from 'src/credit/entities/credit.entity';
import { PaymentDetail } from 'src/credit/entities/payment-detail.entity';
import { Between, Repository } from 'typeorm';
import { CommissionDto } from './dto/commission-dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class ReportService {
    constructor(
        @InjectRepository(Credit) private creditRepository: Repository<Credit>,
        @InjectRepository(PaymentDetail) private paymentDetailRepository: Repository<PaymentDetail>,
        @InjectRepository(User) private userRepository: Repository<User>
    ) { }

    // async getCommissions() {
    //     const currentDate = new Date();
    //     const dates = getDateStartEnd(currentDate, currentDate)
    //     const startDate = dates.startDate;
    //     const endDate = dates.endDate
    //     console.log("date s: ", startDate);
    //     console.log("date e: ", endDate);
    //     const commissions = await this.paymentDetailRepository.createQueryBuilder('paymentDetail')
    //         .leftJoinAndSelect('paymentDetail.credit', 'credit')
    //         .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
    //         .where('paymentDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
    //             startDate,
    //             endDate,
    //         })
    //         .orWhere('paymentDetail.paymentDueDate < :startDate AND paymentDetail.paymentDate IS NULL', { startDate })
    //         .orWhere('paymentDetail.paymentDate BETWEEN :startDate AND :endDate', {
    //             startDate,
    //             endDate,
    //         })
    //         .getMany();
    
    // }


    async getCommissions(): Promise<any[]> {
        const currentDate = new Date();
        const dates = getDateStartEnd(currentDate, currentDate)
        const startDate = dates.startDate;
        const endDate = dates.endDate
        const result = await this.paymentDetailRepository.createQueryBuilder('paymentDetail')       
          .leftJoin('paymentDetail.credit', 'credit')
          .leftJoin('credit.debtCollector', 'debtCollector')
          .select([
            'debtCollector.id as debtCollectorId',
            'CONCAT(debtCollector.lastName, \' \', debtCollector.name) as debtCollectorName',
            'SUM(CASE WHEN (paymentDetail.paymentDueDate BETWEEN :startDate AND :endDate) OR (paymentDetail.paymentDate BETWEEN :startDate AND :endDate) OR (paymentDetail.paymentDueDate < :startDate AND paymentDetail.paymentDate IS NULL) THEN paymentDetail.payment ELSE 0 END) as totalAccountability',
            'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDate AND :endDate) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsRecovery'
          ])
          .where('paymentDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
          })
          .orWhere('paymentDetail.paymentDueDate < :startDate AND paymentDetail.paymentDate IS NULL', { startDate })
          .orWhere('paymentDetail.paymentDate BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
          })
          .groupBy('debtCollector.id, debtCollector.lastName')
          .getRawMany();

          console.log("resultados: ", result);
    
        return result;
      }
}
