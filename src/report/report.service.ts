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
import { CreditHistory } from 'src/credit/entities/credit-history.entity';
import { CommissionCreditDto } from 'src/credit/dto/commission-credit-detail-dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Credit) private creditRepository: Repository<Credit>,
    @InjectRepository(CreditHistory) private creditHistoryRepository: Repository<CreditHistory>,
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
    const status = '1';
    const result = await this.paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'debtCollector.id as debtCollectorId',
        'CONCAT(debtCollector.lastName, \' \', debtCollector.name) as debtCollectorName',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.paymentDate IS NULL AND creditHistory.status =:status) OR (paymentDetail.paymentDueDate < :startDateValue AND paymentDetail.paymentDate IS NULL AND credit.typeCurrency = :currencyPesos AND creditHistory.status =:status) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyDollar AND paymentDetail.paymentDate IS NULL AND creditHistory.status =:status) OR (paymentDetail.paymentDueDate < :startDateValue AND paymentDetail.paymentDate IS NULL AND credit.typeCurrency = :currencyDollar AND creditHistory.status =:status) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesDollar',
        'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.accountabilityDate IS NULL) OR (paymentDetail.paymentDate IS NOT NULL  AND credit.typeCurrency = :currencyPesos AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsCollectedPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDateValue AND :endDateValue  AND credit.typeCurrency = :currencyDollar AND paymentDetail.accountabilityDate IS NULL) OR (paymentDetail.paymentDate IS NOT NULL  AND credit.typeCurrency = :currencyDollar AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsCollectedDollar'
      ])
      .setParameters({ currencyPesos, currencyDollar, startDateValue: startDate, endDateValue: endDate, status })
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
      // console.log("estoy en null");
      const dates = getDateStartEnd(getDateObject(start), getDateObject(end))
      const startDate = dates.startDate;
      const endDate = dates.endDate;
      paymentsDetail = await this.getPaymentsDetailByDebtCollectorByDates(id, startDate, endDate);
    } else {
      //console.log("noo estoy en null");
      paymentsDetail = await this.getPaymentsDetailByDebtCollector(id);
    }
    const paymentsDetailsDto = paymentsDetail.map((x) => {
      return new PaymentDetailReportDto(x);
    });
    const details = new ReportCollectionsAndCommissionsDto(debtCollector, paymentsDetailsDto);
    return details;
  }


  private async getPaymentsDetailByDebtCollector(id: string) {
    const status = '1';
    const paymentsDetail = await this.paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoin('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere(
        new Brackets((qb) => {
          qb.where('paymentDetail.paymentDate IS NOT NULL AND creditHistory.status =:status', { status })
            .andWhere(
              'paymentDetail.recoveryDateCommission IS NULL AND creditHistory.status =:status', { status })
        })
      )
      .getMany();
    return paymentsDetail;
  }


  private async getPaymentsDetailByDebtCollectorByDates(id: string, startDate: any, endDate: any) {
    console.log("init getPaymentsDetailByDebtCollectorByDates")
    console.log("startDate", startDate)
    console.log("endDate", endDate)
    const status = '1';
    const paymentType = 1
    const paymentQuery = this.paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoin('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere(
        new Brackets((qb) => {
          qb.orWhere('paymentDetail.paymentDueDate BETWEEN :startDate AND :endDate AND paymentDetail.paymentDate IS NULL AND paymentDetail.accountabilityDate IS NULL AND creditHistory.status = :status', {
            startDate,
            endDate,
            status
          })
            .orWhere(
              'paymentDetail.paymentDueDate < :startDate AND paymentDetail.paymentDate IS NULL AND paymentDetail.accountabilityDate IS NULL AND creditHistory.status = :status',
              { startDate, status }
            )
            .orWhere('paymentDetail.paymentDate BETWEEN :startDate AND :endDate AND paymentDetail.accountabilityDate IS NULL', {
              startDate,
              endDate,
            })
            .orWhere('paymentDetail.paymentDate < :endDate AND paymentDetail.accountabilityDate IS NULL', {
              endDate
            })
        })
      );
    const paymentsDetail = await paymentQuery.getMany();

    //console.log("pagos a registrar: ", paymentsDetail);

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
      console.log("paymentsDetail**********: ", paymentsDetail);
      await Promise.all(paymentsDetail.map(async (payment) => {
        if (payment.accountabilityDate) {
          payment.recoveryDateCommission = new Date();
          const response = await this.paymentDetailRepository.save(payment);
          console.log("response guardando fecha de pago comission");
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
    const status = '2';
    const result = await this.creditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'debtCollector.id as debtCollectorId',
        'CONCAT(debtCollector.lastName, \' \', debtCollector.name) as debtCollectorName',
        `ROUND(SUM(CASE WHEN (credit.status = :${status} AND credit.typeCurrency = :${currencyPesos}) THEN creditHistory.interest * credit.commission / 100 ELSE 0 END), 2) as totalCommissionsRecoveryPesos`,
        `ROUND(SUM(CASE WHEN  (credit.status = :${status} AND credit.typeCurrency = :${currencyDollar}) THEN creditHistory.interest * credit.commission / 100 ELSE 0 END), 2) as totalCommissionsRecoveryDollar`
      ])
      .groupBy('debtCollector.id, debtCollector.lastName')
      .setParameters({ [currencyPesos]: currencyPesos, [currencyDollar]: currencyDollar, [status]: status })
      .getRawMany();

    //console.log("result commissions: ", result);
    const commissionsTotalDto = result.map(x => {
      return new CommissionTotal(x)
    });
    return commissionsTotalDto;
  }


  async getCommissionsCreditsByDebtCollector(id: number) {
    const status = '2';
    const currencyPesos = 'peso';
    const currencyDollar = 'dolar';
    const result = await this.creditHistoryRepository.createQueryBuilder('creditHistory')
    .leftJoinAndSelect('creditHistory.credit', 'credit')
    .leftJoinAndSelect('credit.client', 'client')
    .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
    .where('debtCollector.id = :id AND credit.status = :status', { id, status })
    .getMany();
    console.log("result: ", result);
    const commissionsCreditDetailDto = result.map(x => {
      return new CommissionCreditDto(x)
    });
    return commissionsCreditDetailDto;
  }

}
