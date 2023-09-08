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
import { CommissionListDebtCollector } from './dto/commission-list-debtCollector-dto';

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
        'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.accountabilityDate IS NULL) OR (paymentDetail.paymentDate IS NOT NULL AND paymentDetail.paymentDate < :endDateValue  AND credit.typeCurrency = :currencyPesos AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsCollectedPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDateValue AND :endDateValue  AND credit.typeCurrency = :currencyDollar AND paymentDetail.accountabilityDate IS NULL) OR (paymentDetail.paymentDate IS NOT NULL AND paymentDetail.paymentDate < :endDateValue  AND credit.typeCurrency = :currencyDollar AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsCollectedDollar'
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

  async registerAccountedPayments(id: string, start: any, end: any) {
    const startObject = getDateObject(start);
    const endObject = getDateObject(end);
    const dates = getDateStartEnd(startObject, endObject);
    const startDate = dates.startDate;
    const endDate = dates.endDate;
    try {
      const paymentsDetail = await this.getPaymentsDetailByDebtCollectorByDates(id, startDate, endDate);
      await Promise.all(paymentsDetail.map(async (payment) => {
        if (payment.paymentDate) {
          payment.accountabilityDate = new Date();
          await this.paymentDetailRepository.save(payment);
          const resultQuery = await this.doesCreditHistoryHaveAllPaymentDetailsWithAccountabilityDate(payment.creditHistory.id);
          console.log("resultQuery: ", resultQuery);
          if (resultQuery) await this.registerStatusAccountedCreditHistory(payment.creditHistory.id)
        }
      })
      );
      return { success: true, error: '' };
    } catch (err) {
      return { success: false, error: 'An error occurred.' };
    }

  }

  private async doesCreditHistoryHaveAllPaymentDetailsWithAccountabilityDate(creditHistoryId: number) {
    const paymentDetails = await this.paymentDetailRepository
      .createQueryBuilder('paymentDetail')
      .where('paymentDetail.creditHistory = :creditHistoryId', {
        creditHistoryId,
      })
      .andWhere('paymentDetail.accountabilityDate IS NULL')
      .getCount();

    return paymentDetails === 0;
  }

  private async registerStatusAccountedCreditHistory(id: number) {
    const creditHistory = await this.creditHistoryRepository.findOne(id);
    if (!creditHistory) {
      throw new NotFoundException(`No se encontró el historial de crédito con el id: ${id}`);
    }
    creditHistory.accounted = true;
    await this.creditHistoryRepository.save(creditHistory);
  }


  // async registerCommissionsPayments(id: string) {
  //   try {
  //     const paymentsDetail = await this.getPaymentsDetailByDebtCollector(id);
  //     console.log("paymentsDetail**********: ", paymentsDetail);
  //     await Promise.all(paymentsDetail.map(async (payment) => {
  //       if (payment.accountabilityDate) {
  //         payment.recoveryDateCommission = new Date();
  //         const response = await this.paymentDetailRepository.save(payment);
  //         console.log("response guardando fecha de pago comission");
  //       }
  //     })
  //     );
  //     return { success: true, error: '' };
  //   } catch (err) {
  //     return { success: false, error: 'An error occurred.' };
  //   }
  // }

  async registerCommissionsCredit(id: number) {
    try {
      const credits = await this.getCreditsByDebtCollector(id)
      console.log("credits: ", credits);
      await Promise.all(credits.map(async (credit) => {
        if (credit.accounted) {
          credit.commissionPaymentDate = new Date();
          await this.creditHistoryRepository.save(credit);
        }
      }))
      return { success: true, error: '' };
    } catch (err) {
      return { success: false, error: 'An error occurred.' };
    }
  }


  private async getCreditsByDebtCollector(id: number) {
    const status = '2';
    return await this.creditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('creditHistory.paymentsDetail', 'paymentDetail')
      .leftJoinAndSelect('credit.client', 'client')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .where('debtCollector.id = :id AND credit.status = :status  AND creditHistory.commissionPaymentDate IS NULL', { id, status })
      .getMany();
  }

  async getCommissionsTotal() {
    const currencyPesos = 'peso';
    const currencyDollar = 'dolar';
    const status = 2;
    const accounted = true;
    const historyStatus = '1';
    const totalCommission = await this.creditRepository
      .createQueryBuilder('credit')
      .innerJoinAndSelect('credit.creditHistory', 'creditHistory')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'debtCollector.id as debtCollectorId',
        'CONCAT(debtCollector.lastName, \' \', debtCollector.name) as debtCollectorName',
        'SUM(CASE WHEN (credit.status = :status AND creditHistory.status = :historyStatus AND creditHistory.accounted = :accounted AND creditHistory.commissionPaymentDate IS NULL AND credit.typeCurrency = :currencyPesos) THEN credit.commission * creditHistory.interest /100 ELSE 0 END) as totalCommissionsPesos',
        'SUM(CASE WHEN (credit.status = :status AND creditHistory.status = :historyStatus AND creditHistory.accounted = :accounted AND creditHistory.commissionPaymentDate IS NULL AND credit.typeCurrency = :currencyDollar) THEN credit.commission * creditHistory.interest /100 ELSE 0 END) as totalCommissionsDollar'
      ])
      .setParameters({ currencyPesos, currencyDollar, status: 2, historyStatus: 1, accounted })
      .groupBy('debtCollector.id, debtCollector.lastName')
      .getRawMany();
    console.log("total: ", totalCommission);
    const commissionsTotalDto = totalCommission.map(x => {
      return new CommissionTotal(x);
    });
    console.log("total commission: ", commissionsTotalDto);
    return commissionsTotalDto;

  }


  async getCommissionsCreditsByDebtCollector(id: number) {

    const debtCollector = await this.userRepository.findOne(id);
    const result = await this.getCreditsByDebtCollector(id);
    //console.log("result: ", result);
    const creditsDetailDto = result.map(x => {
      return new CommissionCreditDto(x)
    });

    const commissionListDebtCollector = new CommissionListDebtCollector(debtCollector, creditsDetailDto);
    return commissionListDebtCollector;
  }


  async getCollectionsAccountedHistory(id: string, start: any, end: any) {
    console.log("id debtCollector: ", id);
    const startDate = getDateStartEnd(start, end).startDate;
    const endDate = getDateStartEnd(start, end).endDate;
    const paymentDetailAccounted = await this.paymentDetailRepository
      .createQueryBuilder('paymentsDetail')
      .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere('paymentsDetail.accountabilityDate IS NOT NULL')
      .orderBy('paymentsDetail.accountabilityDate', 'ASC')
      .getMany();
    // console.log('paymentDetailAccounted: ', paymentDetailAccounted);
    const debtCollector = await this.userRepository.findOne(id);
    const paymentsDetailsDto = paymentDetailAccounted.map((x) => {
      return new PaymentDetailReportDto(x);
    });
    const details = new ReportCollectionsAndCommissionsDto(debtCollector, paymentsDetailsDto);



    return details;
  }

  async getCommissionsCreditsHistory(id: number) {
    const creditsCommissions = await this.creditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('credit.client', 'client')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .where('debtCollector.id = :id AND creditHistory.commissionPaymentDate IS NOT NULL', { id })
      .getMany();
      const debtCollector = await this.userRepository.findOne(id);
      const creditsDetailDto = creditsCommissions.map(x => {
        return new CommissionCreditDto(x)
      });
  
      const commissionListDebtCollector = new CommissionListDebtCollector(debtCollector, creditsDetailDto);
      return commissionListDebtCollector;
  }

}
