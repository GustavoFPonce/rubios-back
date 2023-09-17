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
import { SaleCreditHistory } from 'src/sale-credit/entities/sale-credit-history.entity';
import { PaymentDetailSaleCredit } from 'src/sale-credit/entities/payment-detail-sale-credit.entity';
import { SaleCredit } from 'src/sale-credit/entities/sale-credit.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Credit) private creditRepository: Repository<Credit>,
    @InjectRepository(CreditHistory) private creditHistoryRepository: Repository<CreditHistory>,
    @InjectRepository(PaymentDetail) private paymentDetailRepository: Repository<PaymentDetail>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(SaleCreditHistory) private saleCreditHistoryRepository: Repository<SaleCreditHistory>,
    @InjectRepository(PaymentDetailSaleCredit) private paymentDetailSaleCreditRepository: Repository<PaymentDetailSaleCredit>,
    @InjectRepository(SaleCredit) private saleCreditRepository: Repository<SaleCredit>,
  ) { }

  async getChargesAccountedAndCollected(start: any, end: any, type: string): Promise<any[]> {
    const dates = getDateStartEnd(start, end)
    const startDate = dates.startDate;
    console.log("star date: ", startDate);
    const endDate = dates.endDate;
    console.log("end Date: ", endDate);
    const currencyPesos = 'peso';
    const currencyDollar = 'dolar';
    const status = '1';
    const result = (type == '1') ?
      await this.getChargesAccountedAndCollectedPersonalCredits(currencyPesos, currencyDollar, startDate, endDate, status) :
      await this.getChargesAccountedAndCollectedSaleCredits(currencyPesos, currencyDollar, startDate, endDate, status);

    const chargesAccountedAndCollectedDto = result.map(x => {
      return new TotalChargeAccountedCollected(x);
    })

    return chargesAccountedAndCollectedDto;
    //return null
  }

  private async getChargesAccountedAndCollectedPersonalCredits(currencyPesos: string, currencyDollar: string, startDate: Date, endDate: Date, status: string) {
    return await this.paymentDetailRepository.createQueryBuilder('paymentDetail')
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
  }

  private async getChargesAccountedAndCollectedSaleCredits(currencyPesos: string, currencyDollar: string, startDate: Date, endDate: Date, status: string) {
    return await this.paymentDetailSaleCreditRepository.createQueryBuilder('paymentDetail')
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
  }


  async getCollectionsAndCommissionsDetail(id: string, start: any, end: any, type: string) {
    const debtCollector = await this.userRepository.findOne(id);
    var paymentsDetail: PaymentDetail[] = await this.getPaymentsDetail(id, start, end, type);
    const paymentsDetailsDto = paymentsDetail.map((x) => {
      return new PaymentDetailReportDto(x);
    });
    const details = new ReportCollectionsAndCommissionsDto(debtCollector, paymentsDetailsDto);
    return details;
  }

  private async getPaymentsDetail(id: string, start: any, end: any, type: string) {
    if ((start != 'null' && start != null) && (end != 'null' && end != null)) {
      console.log("no estoy en null");
      const dates = getDateStartEnd(getDateObject(start), getDateObject(end))
      const startDate = dates.startDate;
      const endDate = dates.endDate;
      return await this.getPaymentsDetailByDebtCollectorByDates(id, startDate, endDate, type);
    } else {
      console.log("estoy en null");
      return await this.getPaymentsDetailByDebtCollector(id, type);
    }
  }


  private async getPaymentsDetailByDebtCollector(id: string, type: string) {
    try {
      const status = '1';
      const paymentType = 2;
      const paymentsDetail = (type == '1') ?
        await this.getPaymentsDetailByDebtCollectorPersonalCredits(id, paymentType, status) :
        await this.getPaymentsDetailByDebtCollectorSaleCredits(id, paymentType, status);
      return paymentsDetail;
    } catch (err) { console.log("error: ", err) }

  }

  private async getPaymentsDetailByDebtCollectorPersonalCredits(id: string, paymentType: number, status: string) {
    return await this.paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoin('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere(
        new Brackets((qb) => {
          qb.where('paymentDetail.paymentDate IS NOT NULL AND creditHistory.status =:status AND paymentDetail.accountabilityDate IS NULL', { status })
            .orWhere('paymentDetail.paymentDate IS NOT NULL AND paymentDetail.accountabilityDate IS NULL AND paymentDetail.paymentType =:paymentType', {
              paymentType
            })
        })
      )
      .getMany();
  }

  private async getPaymentsDetailByDebtCollectorSaleCredits(id: string, paymentType: number, status: string) {
    console.log("getPaymentsDetailByDebtCollectorSaleCredits");
    return await this.paymentDetailSaleCreditRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoin('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere(
        new Brackets((qb) => {
          qb.where('paymentDetail.paymentDate IS NOT NULL AND creditHistory.status =:status AND paymentDetail.accountabilityDate IS NULL', { status })
            .orWhere('paymentDetail.paymentDate IS NOT NULL AND paymentDetail.accountabilityDate IS NULL AND paymentDetail.paymentType =:paymentType', {
              paymentType
            })
        })
      )
      .getMany();
  }


  private async getPaymentsDetailByDebtCollectorByDates(id: string, startDate: any, endDate: any, type: string) {
    console.log("init getPaymentsDetailByDebtCollectorByDates")
    console.log("startDate", startDate)
    console.log("endDate", endDate)
    const status = '1';
    const paymentType = 1
    const paymentQuery = (type == '1') ?
      await this.getPaymentsDetailByDebtCollectorByDatesPersonalCredits(id, startDate, endDate, status) :
      await this.getPaymentsDetailByDebtCollectorByDatesSaleCredits(id, startDate, endDate, status)
    const paymentsDetail = await paymentQuery.getMany();

    //console.log("pagos a registrar: ", paymentsDetail);

    return paymentsDetail;
  }

  private async getPaymentsDetailByDebtCollectorByDatesPersonalCredits(id: string, startDate: any, endDate: any, status: string) {
    return this.paymentDetailRepository.createQueryBuilder('paymentDetail')
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
  }

  private async getPaymentsDetailByDebtCollectorByDatesSaleCredits(id: string, startDate: any, endDate: any, status: string) {
    return this.paymentDetailSaleCreditRepository.createQueryBuilder('paymentDetail')
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
  }


  async registerAccountedPayments(id: string, start: any, end: any, type: string) {

    try {
      const paymentsDetail = await this.getPaymentsDetail(id, start, end, type);
      console.log("payments obtenidos para rendir: ", paymentsDetail);
      await Promise.all(paymentsDetail.map(async (payment) => {
        if (payment.paymentDate) {
          payment.accountabilityDate = new Date();
          (type == '1') ? await this.paymentDetailRepository.save(payment) : await this.paymentDetailSaleCreditRepository.save(payment);
          const resultQuery = await this.doesCreditHistoryHaveAllPaymentDetailsWithAccountabilityDate(payment.creditHistory.id, type);
          console.log("resultQuery: ", resultQuery);
          if (resultQuery) await this.registerStatusAccountedCreditHistory(payment.creditHistory.id, type)
        }
      })
      );
      return { success: true, error: '' };
    } catch (err) {
      return { success: false, error: 'An error occurred.' };
    }

  }

  private async doesCreditHistoryHaveAllPaymentDetailsWithAccountabilityDate(creditHistoryId: number, type: string) {
    const paymentDetails = (type == '1') ?
      await this.paymentDetailRepository
        .createQueryBuilder('paymentDetail')
        .where('paymentDetail.creditHistory = :creditHistoryId', {
          creditHistoryId,
        })
        .andWhere('paymentDetail.accountabilityDate IS NULL')
        .getCount() :
      await this.paymentDetailSaleCreditRepository
        .createQueryBuilder('paymentDetail')
        .where('paymentDetail.creditHistory = :creditHistoryId', {
          creditHistoryId,
        })
        .andWhere('paymentDetail.accountabilityDate IS NULL')
        .getCount()

    return paymentDetails === 0;
  }

  private async registerStatusAccountedCreditHistory(id: number, type: string) {
    const creditHistory = (type == '1') ? await this.creditHistoryRepository.findOne(id) : await this.saleCreditHistoryRepository.findOne(id)
    if (!creditHistory) {
      throw new NotFoundException(`No se encontró el historial de crédito con el id: ${id}`);
    }
    creditHistory.accounted = true;
    (type == '1') ?
      await this.creditHistoryRepository.save(creditHistory) :
      await this.saleCreditHistoryRepository.save(creditHistory)
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

  async registerCommissionsCredit(id: number, type: string) {
    try {
      const credits = (type == '1') ? await this.getCreditsByDebtCollectorPersonalCredits(id) :
        await this.getCreditsByDebtCollectorSaleCredits(id)
      //console.log("credits: ", credits);
      await Promise.all(credits.map(async (credit) => {
        if (credit.accounted) {
          credit.commissionPaymentDate = new Date();
          (type == '1') ? await this.creditHistoryRepository.save(credit) :
            await this.saleCreditHistoryRepository.save(credit);
        }
      }))
      return { success: true, error: '' };
    } catch (err) {
      return { success: false, error: 'An error occurred.' };
    }
  }


  private async getCreditsByDebtCollectorPersonalCredits(id: number) {
    const status = '2';
    const results = await this.creditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('creditHistory.paymentsDetail', 'paymentDetail')
      .leftJoinAndSelect('credit.client', 'client')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .where('debtCollector.id = :id AND credit.status = :status AND creditHistory.accounted IS TRUE AND creditHistory.commissionPaymentDate IS NULL', { id, status })
      .getMany();

    console.log("results: ", results)
    return results;
  }

  private async getCreditsByDebtCollectorSaleCredits(id: number) {
    const status = '2';
    const results = await this.saleCreditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('creditHistory.paymentsDetail', 'paymentDetail')
      .leftJoinAndSelect('credit.client', 'client')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .where('debtCollector.id = :id AND credit.status = :status AND creditHistory.accounted IS TRUE AND creditHistory.commissionPaymentDate IS NULL', { id, status })
      .getMany();

    console.log("results: ", results)
    return results;
  }

  async getCommissionsTotal(type: string) {
    const currencyPesos = 'peso';
    const currencyDollar = 'dolar';
    const status = 2;
    const accounted = true;
    const historyStatus = '1';
    const totalCommission = (type == '1') ? await this.getCommissionsTotalPersonalCredits(currencyPesos, currencyDollar, accounted) :
      await this.getCommissionsTotalSaleCredits(currencyPesos, currencyDollar, accounted);
    console.log("total: ", totalCommission);
    const commissionsTotalDto = totalCommission.map(x => {
      return new CommissionTotal(x);
    });
    console.log("total commission: ", commissionsTotalDto);
    return commissionsTotalDto;

  }

  async getCommissionsTotalPersonalCredits(currencyPesos: string, currencyDollar: string, accounted: boolean) {
    return await this.creditRepository
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
  }

  async getCommissionsTotalSaleCredits(currencyPesos: string, currencyDollar: string, accounted: boolean) {
    return await this.saleCreditRepository
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
  }


  async getCommissionsCreditsByDebtCollector(id: number, type: string) {

    const debtCollector = await this.userRepository.findOne(id);
    const result = (type == '1') ? await this.getCreditsByDebtCollectorPersonalCredits(id) :
      await this.getCreditsByDebtCollectorSaleCredits(id);
    //console.log("result: ", result);
    const creditsDetailDto = result.map(x => {
      return new CommissionCreditDto(x)
    });

    const commissionListDebtCollector = new CommissionListDebtCollector(debtCollector, creditsDetailDto);
    return commissionListDebtCollector;
  }


  async getCollectionsAccountedHistory(id: string, start: any, end: any, type: string) {
    console.log("id debtCollector: ", id);
    const startDate = getDateStartEnd(start, end).startDate;
    const endDate = getDateStartEnd(start, end).endDate;
    const paymentDetailAccounted = (type == '1') ?
      await this.getCollectionsAccountedHistoryPersonalCredits(id, startDate, endDate) :
      await this.getCollectionsAccountedHistorySaleCredits(id, startDate, endDate);
    console.log('paymentDetailAccounted: ', paymentDetailAccounted);
    const debtCollector = await this.userRepository.findOne(id);
    const paymentsDetailsDto = paymentDetailAccounted.map((x) => {
      return new PaymentDetailReportDto(x);
    });
    const details = new ReportCollectionsAndCommissionsDto(debtCollector, paymentsDetailsDto);
    return details;
  }

  async getCollectionsAccountedHistoryPersonalCredits(id: string, start: any, end: any) {
    return await this.paymentDetailRepository
      .createQueryBuilder('paymentsDetail')
      .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere('paymentsDetail.accountabilityDate IS NOT NULL')
      .orderBy('paymentsDetail.accountabilityDate', 'ASC')
      .getMany();
  }

  async getCollectionsAccountedHistorySaleCredits(id: string, start: any, end: any) {
    return await this.paymentDetailSaleCreditRepository
      .createQueryBuilder('paymentsDetail')
      .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere('paymentsDetail.accountabilityDate IS NOT NULL')
      .orderBy('paymentsDetail.accountabilityDate', 'ASC')
      .getMany();
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
