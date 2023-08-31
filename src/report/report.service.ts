import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getDateStartEnd } from 'src/common/get-date-start-end';
import { Credit } from 'src/credit/entities/credit.entity';
import { PaymentDetail } from 'src/credit/entities/payment-detail.entity';
import { Between, Brackets, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { TotalChargeAccountedCollected } from './dto/charges-accounted-collected-dto';
import { PaymentDetailReportDto } from './dto/payment-detail-report-dto';
import { ReportCollectionsAndCommissionsDto } from './dto/report-collections-comissions-dto';
import { getDateObject } from 'src/common/get-date-object';
import { CommissionTotal } from './dto/commission-total-dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Credit) private creditRepository: Repository<Credit>,
    @InjectRepository(PaymentDetail) private paymentDetailRepository: Repository<PaymentDetail>,
    @InjectRepository(User) private userRepository: Repository<User>
  ) { }

  async getChargesAccountedAndCollected(start: any, end: any): Promise<any[]> {
    const dates = getDateStartEnd(start, end)
    const startDate = dates.startDate;
    console.log("star date: ", startDate);
    const endDate = dates.endDate;
    console.log("end Date: ", endDate);
    const currencyPesos = 'peso';
    const currencyDollar = 'dolar';
    const result = await this.paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.credit', 'credit')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'debtCollector.id as debtCollectorId',
        'CONCAT(debtCollector.lastName, \' \', debtCollector.name) as debtCollectorName',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.paymentDate IS NULL) OR (paymentDetail.paymentDueDate < :startDateValue AND paymentDetail.paymentDate IS NULL AND credit.typeCurrency = :currencyPesos) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyDollar AND paymentDetail.paymentDate IS NULL) OR (paymentDetail.paymentDueDate < :startDateValue AND paymentDetail.paymentDate IS NULL AND credit.typeCurrency = :currencyDollar) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesDollar',
        'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.accountabilityDate IS NULL) OR (paymentDetail.paymentDate IS NOT NULL  AND credit.typeCurrency = :currencyPesos AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsCollectedPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDateValue AND :endDateValue  AND credit.typeCurrency = :currencyDollar AND paymentDetail.accountabilityDate IS NULL) OR (paymentDetail.paymentDate IS NOT NULL  AND credit.typeCurrency = :currencyDollar AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsCollectedDollar'
      ])
      .setParameters({ currencyPesos, currencyDollar, startDateValue: startDate, endDateValue: endDate })
      .groupBy('debtCollector.id, debtCollector.lastName')
      .getRawMany();

    const chargesAccountedAndCollectedDto = result.map(x => {
      return new TotalChargeAccountedCollected(x);
    })

    return chargesAccountedAndCollectedDto;
    //return null
  }


  async getCollectionsAndCommissionsDetail(id: string, start: any, end: any) {
    var paymentsDetail: PaymentDetail[] = [];
    const debtCollector = await this.userRepository.findOne(id);
    if (start != 'null' && end != 'null') {
      console.log("estoy en null");
      const dates = getDateStartEnd(getDateObject(start), getDateObject(end))
      const startDate = dates.startDate;
      const endDate = dates.endDate;
      paymentsDetail = await this.getPaymentsDetailByDebtCollectorByDates(id, startDate, endDate);
    } else {
      console.log("noo estoy en null");
      paymentsDetail = await this.getPaymentsDetailByDebtCollector(id);
    }
    const paymentsDetailsDto = paymentsDetail.map((x) => {
      return new PaymentDetailReportDto(x);
    });
    const details = new ReportCollectionsAndCommissionsDto(debtCollector, paymentsDetailsDto);
    return details;
  }


  private async getPaymentsDetailByDebtCollector(id: string) {
    const paymentsDetail = await this.paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.credit', 'credit')
      .leftJoin('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere(
        new Brackets((qb) => {
          qb.where('paymentDetail.paymentDate IS NOT NULL')
            .andWhere(
              'paymentDetail.recoveryDateCommission IS NULL')
        })
      )
      .getMany();
    return paymentsDetail;
  }


  private async getPaymentsDetailByDebtCollectorByDates(id: string, startDate: any, endDate: any) {
    console.log("init getPaymentsDetailByDebtCollectorByDates")
    console.log("startDate", startDate)
    console.log("endDate", endDate)
    const paymentQuery = this.paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.credit', 'credit')
      .leftJoin('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere(
        new Brackets((qb) => {
          qb.orWhere('paymentDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
          })
            .orWhere(
              'paymentDetail.paymentDueDate < :startDate AND paymentDetail.paymentDate IS NULL', { startDate }
            )
            .orWhere('paymentDetail.paymentDate BETWEEN :startDate AND :endDate', {
              startDate,
              endDate,
            })
            .orWhere('paymentDetail.paymentDate < :endDate AND paymentDetail.accountabilityDate IS NULL', {
              endDate,
            })
        })
      );
    const paymentsDetail = await paymentQuery.getMany();

    console.log("pagos a registrar: ", paymentsDetail);

    return paymentsDetail;
  }

  async registerSurrenderPayments(id: string, start: any, end: any) {
    const startObject = getDateObject(start);
    const endObject = getDateObject(end);
    const dates = getDateStartEnd(startObject, endObject);
    const startDate = dates.startDate;
    const endDate = dates.endDate;
    try {
      const paymentsDetail = await this.getPaymentsDetailByDebtCollectorByDates(id, startDate, endDate);
      await Promise.all(paymentsDetail.map(async (payment) => {
        if (payment.paymentDate) {
          console.log("rindiendo pago");
          payment.accountabilityDate = new Date();
          await this.paymentDetailRepository.save(payment);
        }
      })
      );
      return { success: true, error: '' };
    } catch (err) {
      return { success: false, error: 'An error occurred.' };
    }

  }


  async registerCommissionsPayments(id: string) {
    try {
      const paymentsDetail = await this.getPaymentsDetailByDebtCollector(id);
      await Promise.all(paymentsDetail.map(async (payment) => {
        if (payment.accountabilityDate) {
          payment.recoveryDateCommission = new Date();
          await this.paymentDetailRepository.save(payment);
        }
      })
      );
      return { success: true, error: '' };
    } catch (err) {
      return { success: false, error: 'An error occurred.' };
    }
  }


  async getCommissionsTotal() {
    const currencyPesos = 'peso';
    const currencyDollar = 'dolar';
    const result = await this.paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.credit', 'credit')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'debtCollector.id as debtCollectorId',
        'CONCAT(debtCollector.lastName, \' \', debtCollector.name) as debtCollectorName',
        `ROUND(SUM(CASE WHEN (paymentDetail.recoveryDateCommission IS NULL AND paymentDetail.paymentDate IS NOT NULL AND credit.typeCurrency = :${currencyPesos}) THEN credit.numberPayment * paymentDetail.payment * credit.commission / 100 ELSE 0 END), 2) as totalCommissionsRecoveryPesos`,
        `ROUND(SUM(CASE WHEN (paymentDetail.recoveryDateCommission IS NULL AND paymentDetail.paymentDate IS NOT NULL AND credit.typeCurrency = :${currencyDollar}) THEN credit.numberPayment * paymentDetail.payment * credit.commission / 100 ELSE 0 END), 2) as totalCommissionsRecoveryDollar`
      ])
      .where('paymentDetail.paymentDate IS NOT NULL')
      .groupBy('debtCollector.id, debtCollector.lastName')
      .setParameters({ [currencyPesos]: currencyPesos, [currencyDollar]: currencyDollar })
      .getRawMany();

    console.log("result commissions: ", result);
    const commissionsTotalDto = result.map(x => {
      return new CommissionTotal(x)
    });
    return commissionsTotalDto;
  }
}
