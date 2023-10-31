import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getDateStartEnd } from 'src/common/get-date-start-end';
import { Credit } from 'src/credit/entities/credit.entity';
import { PaymentDetail } from 'src/credit/entities/payment-detail.entity';
import { Between, Brackets, In, Not, Repository } from 'typeorm';
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
import { StatusCredit } from 'src/credit/enum';
import { LoanPrincipalDto } from './dto/loan-principal-dto';
import { addDays, subDays, subMonths } from 'date-fns';
import { TotalIndicatorDto } from './dto/total-indicator-dto';
import { CreditTransaction } from 'src/cash/entities/credit-transaction.entity';
import { CreditTransactionDetail } from 'src/cash/entities/credit-transaction-detail.entity';
import { TransactionType } from 'src/cash/dto/enum';
import { CreditTransactionCreateDto } from 'src/cash/dto/credit-transaction-create-dto';
import { Cash } from 'src/cash/entities/cash.entity';
import { CashService } from 'src/cash/cash.service';
import { Product } from 'src/product/enities/product.entity';
import { Inventory } from 'src/product/enities/inventory';


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
    @InjectRepository(CreditTransaction)
    private creditTransactionRepository: Repository<CreditTransaction>,
    @InjectRepository(CreditTransactionDetail)
    private creditTransactionDetailRepository: Repository<CreditTransactionDetail>,
    private readonly cashService: CashService,
    @InjectRepository(Cash)
    private cashRepository: Repository<Cash>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
  ) { }





  async getChargesAccountedAndCollected(start: any, end: any, type: string): Promise<any[]> {
    const currencyPesos = 'peso';
    const currencyDollar = 'dolar';
    const status = '1';
    var startDate: Date | null = null;
    var endDate: Date | null = null;
    var result = [];
    if (start != 'null') {
      const dates = getDateStartEnd(start, end)
      startDate = dates.startDate;
      endDate = dates.endDate;
      result = (type == '1') ?
        await this.getChargesAccountedAndCollectedPersonalCreditsByRangeDate(currencyPesos, currencyDollar, startDate, endDate, status) :
        await this.getChargesAccountedAndCollectedSaleCreditsByRangeDate(currencyPesos, currencyDollar, startDate, endDate, status);
    } else {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset());
      result = (type == '1') ?
        await this.getChargesAccountedAndCollectedPersonalCredits(currencyPesos, currencyDollar, endDate, status) :
        await this.getChargesAccountedAndCollectedSaleCredits(currencyPesos, currencyDollar, endDate, status);
    }

    const chargesAccountedAndCollectedDto = result.map(x => {
      return new TotalChargeAccountedCollected(x);
    })

    return chargesAccountedAndCollectedDto;
    //return null
  }

  private async getChargesAccountedAndCollectedPersonalCreditsByRangeDate(currencyPesos: string, currencyDollar: string, startDate: Date, endDate: Date, status: string) {
    return await this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.credits', 'credit')
      .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.paymentsDetail', 'paymentDetail')
      //.leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'user.id as debtCollectorId',
        'CONCAT(user.lastName, \' \', user.name) as debtCollectorName',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.paymentDate IS NULL AND creditHistory.status =:status) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyDollar AND paymentDetail.paymentDate IS NULL AND creditHistory.status =:status) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesDollar',
        'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.actualPayment ELSE 0 END) as totalPaymentsCollectedPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDateValue AND :endDateValue  AND credit.typeCurrency = :currencyDollar AND paymentDetail.accountabilityDate IS NULL)THEN paymentDetail.actualPayment ELSE 0 END) as totalPaymentsCollectedDollar'
      ])
      .setParameters({ currencyPesos, currencyDollar, startDateValue: startDate, endDateValue: endDate, status })
      .groupBy('user.id, user.lastName')
      .getRawMany();
  }

  private async getChargesAccountedAndCollectedSaleCreditsByRangeDate(currencyPesos: string, currencyDollar: string, startDate: Date, endDate: Date, status: string) {
    return await this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.saleCredits', 'credit')
      .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.paymentsDetail', 'paymentDetail')
      //.leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'user.id as debtCollectorId',
        'CONCAT(user.lastName, \' \', user.name) as debtCollectorName',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.paymentDate IS NULL AND creditHistory.status =:status) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyDollar AND paymentDetail.paymentDate IS NULL AND creditHistory.status =:status) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesDollar',
        'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDateValue AND :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsCollectedPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDate BETWEEN :startDateValue AND :endDateValue  AND credit.typeCurrency = :currencyDollar AND paymentDetail.accountabilityDate IS NULL)THEN paymentDetail.payment ELSE 0 END) as totalPaymentsCollectedDollar'
      ])
      .setParameters({ currencyPesos, currencyDollar, startDateValue: startDate, endDateValue: endDate, status })
      .groupBy('user.id, user.lastName')
      .getRawMany();
  }

  private async getChargesAccountedAndCollectedPersonalCredits(currencyPesos: string, currencyDollar: string, endDate: Date, status: string) {
    return await this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.credits', 'credit')
      .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.paymentsDetail', 'paymentDetail')
      //.leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'user.id as debtCollectorId',
        'CONCAT(user.lastName, \' \', user.name) as debtCollectorName',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate <= :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.paymentDate IS NULL AND creditHistory.status =:status) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate <= :endDateValue AND credit.typeCurrency = :currencyDollar AND paymentDetail.paymentDate IS NULL AND creditHistory.status =:status) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesDollar',
        'SUM(CASE WHEN (paymentDetail.paymentDate <= :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.actualPayment ELSE 0 END) as totalPaymentsCollectedPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDate <= :endDateValue AND credit.typeCurrency = :currencyDollar AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.actualPayment ELSE 0 END) as totalPaymentsCollectedDollar'
      ])
      .setParameters({ currencyPesos, currencyDollar, endDateValue: endDate, status })
      .groupBy('user.id, user.lastName')
      .getRawMany();
  }

  private async getChargesAccountedAndCollectedSaleCredits(currencyPesos: string, currencyDollar: string, endDate: Date, status: string) {
    return await this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.saleCredits', 'credit')
      .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.paymentsDetail', 'paymentDetail')
      //.leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'user.id as debtCollectorId',
        'CONCAT(user.lastName, \' \', user.name) as debtCollectorName',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate <= :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.paymentDate IS NULL AND creditHistory.status =:status) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDueDate <= :endDateValue AND credit.typeCurrency = :currencyDollar AND paymentDetail.paymentDate IS NULL AND creditHistory.status =:status) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsReceivablesDollar',
        'SUM(CASE WHEN (paymentDetail.paymentDate <= :endDateValue AND credit.typeCurrency = :currencyPesos AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.actualPayment ELSE 0 END) as totalPaymentsCollectedPesos',
        'SUM(CASE WHEN (paymentDetail.paymentDate <= :endDateValue AND credit.typeCurrency = :currencyDollar AND paymentDetail.accountabilityDate IS NULL) THEN paymentDetail.actualPayment ELSE 0 END) as totalPaymentsCollectedDollar'
      ])
      .setParameters({ currencyPesos, currencyDollar, endDateValue: endDate, status })
      .groupBy('user.id, user.lastName')
      .getRawMany();
  }



  async getPaymentsCollectedAndPendingDetail(id: string, start: any, end: any, type: string) {
    const debtCollector = await this.userRepository.findOne({ where: { id: id }, relations:['role']});
    var paymentsDetail: PaymentDetail[] = await this.getPaymentsDetail(id, start, end, type);
    const paymentsDetailsDto = paymentsDetail.map((x) => {
      return new PaymentDetailReportDto(x);
    });
    const details = new ReportCollectionsAndCommissionsDto(debtCollector, paymentsDetailsDto);
    return details;
  }


  private async getPaymentsDetail(id: string, start: any, end: any, type: string) {
    if (start != 'null' && start != null) {
      const dates = getDateStartEnd(getDateObject(start), new Date(end))
      const startDate = dates.startDate;
      const endDate = dates.endDate;
      return await this.getPaymentsDetailByDebtCollectorByDates(id, startDate, endDate, type);
    } else {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset());
      const paymentsRendicion = await this.getPaymentsDetailByDebtCollector(id, type, endDate);
      return paymentsRendicion;
    }
  }



  async getCollectionsAndCommissionsDetail(id: string, start: any, end: any, type: string) {
    const debtCollector = await this.userRepository.findOne({ where: { id: id }, relations:['role']});
    var paymentsDetail: PaymentDetail[] = await this.getPaymentsDetail(id, start, end, type);
    const paymentsDetailsDto = paymentsDetail.map((x) => {
      return new PaymentDetailReportDto(x);
    });
    const details = new ReportCollectionsAndCommissionsDto(debtCollector, paymentsDetailsDto);
    return details;
  }


  private async getPaymentsDetailByDebtCollector(id: string, type: string, endDate: Date) {
    try {
      const status = '1';
      const paymentType = 2;
      const paymentsDetail = (type == '1') ?
        await this.getPaymentsDetailByDebtCollectorPersonalCredits(id, paymentType, status, endDate) :
        await this.getPaymentsDetailByDebtCollectorSaleCredits(id, paymentType, status, endDate);
      return paymentsDetail;
    } catch (err) { console.log("error: ", err) }

  }

  private async getPaymentsDetailByDebtCollectorPersonalCredits(id: string, paymentType: number, status: string, endDate: Date) {
    return await this.paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoin('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere(
        new Brackets((qb) => {
          qb.where('((paymentDetail.paymentDueDate <= :endDate AND paymentDetail.accountabilityDate IS NULL AND creditHistory.status =:status) OR (paymentDetail.paymentDate <= :endDate AND paymentDetail.accountabilityDate IS NULL AND creditHistory.status =:status))', { status, endDate })
            .orWhere('paymentDetail.paymentDate <= :endDate AND paymentDetail.accountabilityDate IS NULL AND paymentDetail.paymentType =:paymentType', {
              paymentType,
              endDate
            })
        })
      )
      .getMany();
  }

  private async getPaymentsDetailByDebtCollectorSaleCredits(id: string, paymentType: number, status: string, endDate: Date) {
    return await this.paymentDetailSaleCreditRepository.createQueryBuilder('paymentDetail')
      .leftJoinAndSelect('paymentDetail.creditHistory', 'creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoin('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('debtCollector.id = :id', { id })
      .andWhere(
        new Brackets((qb) => {
          qb.where('((paymentDetail.paymentDueDate <= :endDate AND paymentDetail.accountabilityDate IS NULL AND creditHistory.status =:status) OR (paymentDetail.paymentDate <= :endDate AND paymentDetail.accountabilityDate IS NULL AND creditHistory.status =:status))', { status, endDate })
            .orWhere('paymentDetail.paymentDate <= :endDate AND paymentDetail.accountabilityDate IS NULL AND paymentDetail.paymentType =:paymentType', {
              paymentType,
              endDate
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
            .orWhere('paymentDetail.paymentDate BETWEEN :startDate AND :endDate AND paymentDetail.accountabilityDate IS NULL', {
              startDate,
              endDate,
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
            .orWhere('paymentDetail.paymentDate BETWEEN :startDate AND :endDate AND paymentDetail.accountabilityDate IS NULL', {
              startDate,
              endDate,
            })
        })
      );

  }


  async registerAccountedPayments(id: string, start: any, end: any, type: string) {

    try {
      const paymentsDetail = await this.getPaymentsDetail(id, start, end, type);

      for (const payment of paymentsDetail) {
        if (payment.paymentDate) {
          payment.accountabilityDate = new Date();
          if (type == '1') {
            await this.paymentDetailRepository.save(payment);
          } else {
            await this.paymentDetailSaleCreditRepository.save(payment);
          }
          const transactionDetail = await this.creditTransactionDetailRepository.findOne({ where: { paymentId: payment.id }, relations: ['creditTransaction'] });
          const creditTransaction = transactionDetail?.creditTransaction;
          console.log("creditTransaction: ", creditTransaction);
          if (creditTransaction) {
            creditTransaction.accounted = true;
            const updateTransaction = await this.creditTransactionRepository.save(creditTransaction);
          }
          const resultQuery = await this.doesCreditHistoryHaveAllPaymentDetailsWithAccountabilityDate(payment.creditHistory.id, type);
          if (resultQuery) {
            await this.registerStatusAccountedCreditHistory(payment.creditHistory.id, type);
          }
        }
      }

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


  async registerCommissionsCredit(id: number, type: string) {
    try {
      var lastCash = await this.cashRepository.findOne({ order: { id: 'DESC' } });
      if (!lastCash || lastCash.closingDate != null) {
        lastCash = (await this.cashService.openCash()).cash;
      }
      const user = await this.userRepository.findOne(id);
      const credits = (type == '1') ? await this.getCreditsByDebtCollectorPersonalCredits(id) :
        await this.getCreditsByDebtCollectorSaleCredits(id)
      //console.log("credits: ", credits);
      for (const credit of credits) {
        if (credit.accounted) {
          credit.commissionPaymentDate = new Date();
          if (type == '1') {
            await this.creditHistoryRepository.save(credit)
          } else {
            await this.saleCreditHistoryRepository.save(credit);
          }
          await this.createTransaction(credit.credit, lastCash, (credit.credit.commission / 100 * credit.interest), (type == '1') ? 'Comisión Crédito Personal' : 'Comisión Crédito Venta', user);
        }
      };

      return { success: true, error: '' };
    } catch (err) {
      return { success: false, error: 'An error occurred.' };
    }
  }


  private async createTransaction(credit: Credit, cash: Cash, amount: number, concept: string, user: User) {
    var newTransaction = new CreditTransactionCreateDto(credit.client, credit, cash, amount, concept, TransactionType.commission, user, true);
    const response = await this.cashService.createTransaction(newTransaction);
    return response;
  }

  private async getCreditsByDebtCollectorPersonalCredits(id: number) {
    const status = '2';
    const statusCreditHistory = 1;
    const results = await this.creditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('creditHistory.paymentsDetail', 'paymentDetail')
      .leftJoinAndSelect('credit.client', 'client')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .where('debtCollector.id = :id AND credit.status = :status AND creditHistory.status =:statusCreditHistory AND creditHistory.accounted IS TRUE AND creditHistory.commissionPaymentDate IS NULL',
        { id, status, statusCreditHistory })
      .getMany();

    console.log("results: ", results)
    return results;
  }

  private async getCreditsByDebtCollectorSaleCredits(id: number) {
    const status = '2';
    const statusCreditHistory = 1;
    const results = await this.saleCreditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('creditHistory.paymentsDetail', 'paymentDetail')
      .leftJoinAndSelect('credit.client', 'client')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .where('debtCollector.id = :id AND credit.status = :status AND creditHistory.status =:statusCreditHistory AND creditHistory.accounted IS TRUE AND creditHistory.commissionPaymentDate IS NULL',
        { id, status, statusCreditHistory })
      .getMany();

    console.log("results: ", results)
    return results;
  }

  async getCommissionsTotal(type: string) {
    console.log("type: ", type);
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
    return await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.credits', 'credit')
      .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'user.id as debtCollectorId',
        'CONCAT(user.lastName, \' \', user.name) as debtCollectorName',
        'SUM(CASE WHEN (credit.status = :status AND creditHistory.status = :historyStatus AND creditHistory.accounted = :accounted AND creditHistory.commissionPaymentDate IS NULL AND credit.typeCurrency = :currencyPesos) THEN credit.commission * creditHistory.interest /100 ELSE 0 END) as totalCommissionsPesos',
        'SUM(CASE WHEN (credit.status = :status AND creditHistory.status = :historyStatus AND creditHistory.accounted = :accounted AND creditHistory.commissionPaymentDate IS NULL AND credit.typeCurrency = :currencyDollar) THEN credit.commission * creditHistory.interest /100 ELSE 0 END) as totalCommissionsDollar'
      ])
      .setParameters({ currencyPesos, currencyDollar, status: 2, historyStatus: 1, accounted })
      .groupBy('user.id, user.lastName')
      .getRawMany();
  }

  async getCommissionsTotalSaleCredits(currencyPesos: string, currencyDollar: string, accounted: boolean) {
    return await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.saleCredits', 'credit')
      .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .select([
        'user.id as debtCollectorId',
        'CONCAT(user.lastName, \' \', user.name) as debtCollectorName',
        'SUM(CASE WHEN (credit.status = :status AND creditHistory.status = :historyStatus AND creditHistory.accounted = :accounted AND creditHistory.commissionPaymentDate IS NULL AND credit.typeCurrency = :currencyPesos) THEN credit.commission * creditHistory.interest /100 ELSE 0 END) as totalCommissionsPesos',
        'SUM(CASE WHEN (credit.status = :status AND creditHistory.status = :historyStatus AND creditHistory.accounted = :accounted AND creditHistory.commissionPaymentDate IS NULL AND credit.typeCurrency = :currencyDollar) THEN credit.commission * creditHistory.interest /100 ELSE 0 END) as totalCommissionsDollar'
      ])
      .setParameters({ currencyPesos, currencyDollar, status: 2, historyStatus: 1, accounted })
      .groupBy('user.id, user.lastName')
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

  async getCommissionsCreditsHistory(id: number, type: string) {
    const creditsCommissions = (type == '1') ? await this.getCommissionsCreditsHistoryByTypeCredit(id, this.creditHistoryRepository) :
      await this.getCommissionsCreditsHistoryByTypeCredit(id, this.saleCreditHistoryRepository)
    const debtCollector = await this.userRepository.findOne(id);
    const creditsDetailDto = creditsCommissions.map(x => {
      return new CommissionCreditDto(x)
    });

    const commissionListDebtCollector = new CommissionListDebtCollector(debtCollector, creditsDetailDto);
    return commissionListDebtCollector;
  };

  private async getCommissionsCreditsHistoryByTypeCredit(id: number, creditHistoryRepository: any) {
    return await creditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('credit.client', 'client')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .where('debtCollector.id = :id AND creditHistory.commissionPaymentDate IS NOT NULL', { id })
      .getMany();
  }

  async getLoanPrincipal() {
    const notDesiredStatuses = [StatusCredit.canceled, StatusCredit.annulled];
    var resultsCredits: LoanPrincipalDto[] = [];
    const resultPersonalCredist = await this.creditRepository.find({ where: { status: Not(In(notDesiredStatuses)) }, relations: ['client', 'creditHistory'] });
    resultPersonalCredist.forEach(credit => {
      const dto = new LoanPrincipalDto(credit, 'Crédito Personal');
      resultsCredits.push(dto);
    });
    const resultSaleCredits = await this.saleCreditRepository.find({ where: { status: Not(In(notDesiredStatuses)) }, relations: ['client', 'creditHistory'] })
    resultSaleCredits.forEach(credit => {
      const dto = new LoanPrincipalDto(credit, 'Crédito Venta');
      resultsCredits.push(dto);
    });

    console.log("loan principal: ", resultSaleCredits);
    return resultsCredits;
  }

  async getPendingBalanceCredits() {
    const currencyPesos = 'peso';
    const currencyDollar = 'dolar';
    const status = '1';
    const statusCredit = 2;
    const report = await this.creditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoin('creditHistory.paymentsDetail', 'paymentDetail')
      .leftJoin('creditHistory.credit', 'credit')
      .select([
        'CONCAT(creditHistory.id) as creditHistoryId',
        `SUM(CASE WHEN (paymentDetail.paymentDate IS NOT NULL AND credit.typeCurrency = :currencyPesos AND creditHistory.status = :status AND credit.status != :creditStatus) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsPesos`,
        `SUM(CASE WHEN (paymentDetail.paymentDate IS NOT NULL AND credit.typeCurrency = :currencyDollar AND creditHistory.status = :status AND credit.status != :creditStatus) THEN paymentDetail.payment ELSE 0 END) as totalPaymentsDollar`,
      ])
      .setParameters({ currencyPesos, currencyDollar, status: 1, creditStatus: 2 })
      .groupBy('creditHistory.id')
      .getRawMany();

    console.log("report balance: ", report);
  }

  async getTotalBalance(currency: string, year: string) {
    const status = [StatusCredit.canceled, StatusCredit.annulled, StatusCredit.bad];
    const historyStatus = '1';
    const totalBalancePersonalCredits = await this.getTotalBalanceByRepository(currency, year, status, historyStatus, this.creditHistoryRepository);
    const totalBalanceSaleCredits = await this.getTotalBalanceByRepository(currency, year, status, historyStatus, this.saleCreditHistoryRepository);

    const total = {
      total: totalBalancePersonalCredits.totalBalance + totalBalanceSaleCredits.totalBalance,
      totalRecords: parseInt(totalBalancePersonalCredits.totalRecords) + parseInt(totalBalanceSaleCredits.totalRecords)
    }
    return total;
  }

  private async getTotalBalanceByRepository(currency: string, year: string, status: StatusCredit[], historyStatus: string, creditHistoryRepository: any) {
    return await creditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoin('creditHistory.credit', 'credit')
      .select([
        `SUM(CASE WHEN (
        credit.status  NOT IN (:...status) AND
         credit.typeCurrency = :currency AND
          creditHistory.status  = :historyStatus) THEN creditHistory.balance ELSE 0 END) as totalBalance`,
        `COUNT(CASE WHEN (
         credit.status  NOT IN (:...status) AND
          credit.typeCurrency = :currency AND
           creditHistory.status  = :historyStatus) THEN 1 ELSE NULL END) as totalRecords`,

      ])
      .setParameters({ year, currency, status, historyStatus })
      .getRawOne();

  }

  async getTotalBalanceBadCredits(currency: string, year: string) {
    const status = [StatusCredit.canceled, StatusCredit.active, StatusCredit.annulled, StatusCredit.delinquent];
    const historyStatus = '1';
    const totalBalanceBadPersonalCredits = await this.getTotalBalanceByRepository(currency, year, status, historyStatus, this.creditHistoryRepository);
    const totalBalanceBadSaleCredits = await this.getTotalBalanceByRepository(currency, year, status, historyStatus, this.saleCreditHistoryRepository);

    const total = {
      total: totalBalanceBadPersonalCredits.totalBalance + totalBalanceBadSaleCredits.totalBalance,
      totalRecords: parseInt(totalBalanceBadPersonalCredits.totalRecords) + parseInt(totalBalanceBadSaleCredits.totalRecords)
    }
    return total;
  }

  async getTotalIndicators(currency: string) {
    const status = [StatusCredit.annulled, StatusCredit.bad];
    const historyStatus = '1';
    const dates = getDateStartEnd(new Date(), new Date());
    const isNext = true;
    const totalRecordsPaymentsPersonalCredit = await this.getTotalRecordsPaymentsCredits(currency, status, historyStatus, this.paymentDetailRepository, isNext);
    const totalRecordsPaymentsSaleCredit = await this.getTotalRecordsPaymentsCredits(currency, status, historyStatus, this.paymentDetailSaleCreditRepository, isNext);
    const totalPaymentsPersonalCredit = await this.getTotalPaymentsCredits(currency, status, historyStatus, this.paymentDetailRepository, isNext);
    const totalPaymentsSaleCredit = await this.getTotalPaymentsCredits(currency, status, historyStatus, this.paymentDetailSaleCreditRepository, isNext);
    const totalRecords = parseFloat(totalRecordsPaymentsPersonalCredit.totalRecords) + parseFloat(totalRecordsPaymentsSaleCredit.totalRecords);
    const totalCredits = parseFloat(totalPaymentsPersonalCredit.total) + parseFloat(totalPaymentsSaleCredit.total);
    const indicatorsCurrentPaymentsPersonalCredits = await this.getIndicatorsCurrentsPayments(currency, status, historyStatus, dates.startDate, dates.endDate, this.paymentDetailRepository, isNext);
    const indicatorsCurrentPaymentsSaleCredits = await this.getIndicatorsCurrentsPayments(currency, status, historyStatus, dates.startDate, dates.endDate, this.paymentDetailSaleCreditRepository, isNext);
    const totalCurrentPayments = new TotalIndicatorDto('Al Corriente', indicatorsCurrentPaymentsPersonalCredits, indicatorsCurrentPaymentsSaleCredits, totalRecords, totalCredits);
    const indicatorsUpcomingDuePaymentPersonalCredits = await this.getIndicatorsDuePayment(currency, status, historyStatus, addDays(dates.startDate, 1), addDays(dates.endDate, 4), this.paymentDetailRepository, isNext);
    const indicatorsUpcomingDuePaymentSaleCredits = await this.getIndicatorsDuePayment(currency, status, historyStatus, addDays(dates.startDate, 1), addDays(dates.endDate, 4), this.paymentDetailSaleCreditRepository, isNext);
    const totalUpcomingDuePayments = new TotalIndicatorDto('Próximos', indicatorsUpcomingDuePaymentPersonalCredits, indicatorsUpcomingDuePaymentSaleCredits, totalRecords, totalCredits);
    const indicatorsDueTodayPaymentPersonalCredits = await this.getIndicatorsDuePayment(currency, status, historyStatus, dates.startDate, dates.endDate, this.paymentDetailRepository, isNext);
    const indicatorsDueTodayPaymentSaleCredits = await this.getIndicatorsDuePayment(currency, status, historyStatus, dates.startDate, dates.endDate, this.paymentDetailSaleCreditRepository, isNext);
    const totalDueTodayPayments = new TotalIndicatorDto('Por Vencer', indicatorsDueTodayPaymentPersonalCredits, indicatorsDueTodayPaymentSaleCredits, totalRecords, totalCredits);
    const indicatorsOverduePaymentPersonalCredits = await this.getIndicatorsDuePayment(currency, status, historyStatus, subDays(dates.startDate, 11), subDays(dates.endDate, 1), this.paymentDetailRepository, isNext);
    const indicatorsOverduePaymentSaleCredits = await this.getIndicatorsDuePayment(currency, status, historyStatus, subDays(dates.startDate, 11), subDays(dates.endDate, 1), this.paymentDetailSaleCreditRepository, isNext);
    const totalOverduePayments = new TotalIndicatorDto('Vencidos', indicatorsOverduePaymentPersonalCredits, indicatorsOverduePaymentSaleCredits, totalRecords, totalCredits);
    const indicatorsOverduePaymentAlertPersonalCredits = await this.getIndicatorAlertsDuePayment(currency, status, historyStatus, subDays(dates.endDate, 12), this.paymentDetailRepository, isNext);
    const indicatorsOverduePaymentAlertSaleCredits = await this.getIndicatorAlertsDuePayment(currency, status, historyStatus, subDays(dates.endDate, 12), this.paymentDetailSaleCreditRepository, isNext);
    const totalOverduePaymentAlert = new TotalIndicatorDto('Alerta', indicatorsOverduePaymentAlertPersonalCredits, indicatorsOverduePaymentAlertSaleCredits, totalRecords, totalCredits);
    // console.log("indicadores: ", [
    //   totalCurrentPayments,
    //   totalUpcomingDuePayments,
    //   totalDueTodayPayments,
    //   totalOverduePayments,
    //   totalOverduePaymentAlert
    // ]);

    return [
      totalCurrentPayments,
      totalUpcomingDuePayments,
      totalDueTodayPayments,
      totalOverduePayments,
      totalOverduePaymentAlert
    ]

  }

  private async getTotalRecordsPaymentsCredits(currency: string, status: StatusCredit[], historyStatus: string,
    paymentDetailRepository: any, isNext: boolean) {
    return await paymentDetailRepository
      .createQueryBuilder('paymentDetail')
      .leftJoin('paymentDetail.creditHistory', 'creditHistory')
      .leftJoin('creditHistory.credit', 'credit')
      .select(`COUNT(CASE WHEN (
        paymentDetail.isNext = :isNext AND
      credit.status NOT IN (:...status) AND
       credit.typeCurrency = :currency AND
        creditHistory.status  = :historyStatus) THEN 1 ELSE NULL END) as totalRecords`)
      .setParameters({ currency, status, historyStatus, isNext })
      .getRawOne();
  }

  private async getTotalPaymentsCredits(currency: string, status: StatusCredit[], historyStatus: string,
    paymentDetailRepository: any, isNext: boolean) {
    return await paymentDetailRepository
      .createQueryBuilder('paymentDetail')
      .leftJoin('paymentDetail.creditHistory', 'creditHistory')
      .leftJoin('creditHistory.credit', 'credit')
      .select(`SUM(CASE WHEN (
        paymentDetail.isNext = :isNext AND
      credit.status NOT IN (:...status) AND
       credit.typeCurrency = :currency AND
        creditHistory.status  = :historyStatus) THEN paymentDetail.payment ELSE 0 END) as total`)
      .setParameters({ currency, status, historyStatus, isNext })
      .getRawOne();
  }

  private async getIndicatorsCurrentsPayments(currency: string,
    status: StatusCredit[], historyStatus: string, startDate: Date,
    endDate: Date, paymentDetailRepository: any, isNext: boolean) {
    const startDateRef = addDays(startDate, 5);
    return await paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoin('paymentDetail.creditHistory', 'creditHistory')
      .leftJoin('creditHistory.credit', 'credit')
      .select([
        `SUM(CASE WHEN ((paymentDetail.paymentDate BETWEEN :startDate AND :endDate OR
           paymentDetail.paymentDueDate >= :startDateRef) AND
           paymentDetail.isNext = :isNext AND
            credit.status NOT IN (:...status) AND
             credit.typeCurrency = :currency AND
              creditHistory.status  = :historyStatus) THEN paymentDetail.payment ELSE 0 END) as totalBalance`,
        `COUNT(CASE WHEN ((paymentDetail.paymentDate BETWEEN :startDate AND :endDate OR
           paymentDetail.paymentDueDate >= :startDateRef) AND
           paymentDetail.isNext = :isNext AND
            credit.status NOT IN (:...status) AND
             credit.typeCurrency = :currency AND
              creditHistory.status  = :historyStatus) THEN 1 ELSE NULL END) as totalRecords`,
      ])
      .setParameters({ currency, status, historyStatus, startDate, endDate, startDateRef, isNext })
      .getRawOne();
  }

  private async getIndicatorsDuePayment(currency: string, status: StatusCredit[], historyStatus: string,
    startDate: Date, endDate: Date, paymentDetailRepository: any, isNext: boolean) {
    return await paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoin('paymentDetail.creditHistory', 'creditHistory')
      .leftJoin('creditHistory.credit', 'credit')
      .select([
        `SUM(CASE WHEN (paymentDetail.paymentDate IS NULL AND
           paymentDetail.paymentDueDate BETWEEN :startDate AND :endDate AND
           paymentDetail.isNext = :isNext AND
            credit.status NOT IN (:...status) AND
             credit.typeCurrency = :currency AND
              creditHistory.status  = :historyStatus) THEN paymentDetail.payment ELSE 0 END) as totalBalance`,
        `COUNT(CASE WHEN (paymentDetail.paymentDate IS NULL AND
           paymentDetail.paymentDueDate BETWEEN :startDate AND :endDate AND
           paymentDetail.isNext = :isNext AND
            credit.status NOT IN (:...status) AND
             credit.typeCurrency = :currency AND
              creditHistory.status  = :historyStatus) THEN 1 ELSE NULL END) as totalRecords`,
      ])
      .setParameters({ currency, status, historyStatus, startDate, endDate, isNext })
      .getRawOne();
  }

  private async getIndicatorAlertsDuePayment(currency: string, status: StatusCredit[], historyStatus: string,
    endDate: Date, paymentDetailRepository: any, isNext: boolean) {
    return await paymentDetailRepository.createQueryBuilder('paymentDetail')
      .leftJoin('paymentDetail.creditHistory', 'creditHistory')
      .leftJoin('creditHistory.credit', 'credit')
      .select([
        `SUM(CASE WHEN (paymentDetail.paymentDate IS NULL AND
           paymentDetail.paymentDueDate <= :endDate AND
           paymentDetail.isNext = :isNext AND
            credit.status NOT IN (:...status) AND
             credit.typeCurrency = :currency AND 
             creditHistory.status  = :historyStatus) THEN paymentDetail.payment ELSE 0 END) as totalBalance`,
        `COUNT(CASE WHEN (paymentDetail.paymentDate IS NULL AND 
          paymentDetail.paymentDueDate <= :endDate AND
          paymentDetail.isNext = :isNext AND
           credit.status NOT IN (:...status) AND
            credit.typeCurrency = :currency AND 
            creditHistory.status  = :historyStatus) THEN 1 ELSE NULL END) as totalRecords`,
      ])
      .setParameters({ currency, status, historyStatus, endDate, isNext })
      .getRawOne();
  }

  async getMonthlyCredits() {
    const personalCredits = await this.getCreditsByMonths(this.creditHistoryRepository);
    console.log("personalCredits: ", personalCredits);
    const saleCredits = await this.getCreditsByMonths(this.saleCreditHistoryRepository);
    console.log("saleCredits: ", saleCredits);

    const personalCreditsInPesos = await this.getCreditsInPesosByMonths(this.creditHistoryRepository);
    const personalCreditsInDolars = await this.getCreditsInDolarsByMonths(this.creditHistoryRepository);

    const saleCreditsInPesos = await this.getCreditsInPesosByMonths(this.saleCreditHistoryRepository);
    const saleCreditsInDolars = await this.getCreditsInDolarsByMonths(this.saleCreditHistoryRepository);


    return {
      personalCredits, saleCredits, personalCreditsInPesos, personalCreditsInDolars, saleCreditsInPesos, saleCreditsInDolars
    }
  }

  async getMonthlyAmountsCredits() {
    const personalCreditPesos = await this.getCreditAmountsByMonths(this.creditHistoryRepository, 'peso');
    const saleCreditPesos = await this.getCreditAmountsByMonths(this.saleCreditHistoryRepository, 'peso');

    const personalCreditDolars = await this.getCreditAmountsByMonths(this.creditHistoryRepository, 'dolar');
    const saleCreditDolars = await this.getCreditAmountsByMonths(this.saleCreditHistoryRepository, 'dolar');
    return {
      personalCreditPesos, saleCreditPesos, personalCreditDolars, saleCreditDolars
    }
  }

  async getExpiredCredits() {
    const queryBuilder = this.creditRepository.createQueryBuilder('credit')
      .select(['credit.id as id', 'client.name as name', 'client.lastName as lastName', 'MAX(ABS(DATEDIFF(pd.paymentDueDate, CURDATE()))) AS delay'])
      .leftJoin('credit.creditHistory', 'creditHistory')
      .leftJoin('credit.client', 'client')
      .innerJoin('creditHistory.paymentsDetail', 'pd', 'creditHistory.id = pd.credit_history_id and pd.paymentDueDate <= curdate() and pd.paymentDate is null')
      .where('creditHistory.status = 1')

      .groupBy('credit.id')
      .addOrderBy('delay', 'DESC')

    return (await queryBuilder.getRawMany()).filter(x => x.delay > 0);
  }

  async getExpiredCreditCount() {
    const queryExpiredBuilder = this.creditRepository.createQueryBuilder('credit')
      .select(['credit.id'])
      .leftJoin('credit.creditHistory', 'creditHistory')
      .leftJoin('credit.client', 'client')
      .innerJoin('creditHistory.paymentsDetail', 'pd', 'creditHistory.id = pd.credit_history_id and pd.paymentDueDate <= curdate() and pd.paymentDate is null and ABS(DATEDIFF(pd.paymentDueDate, CURDATE())) > 0')
      .where('creditHistory.status = 1')

    const expiredCount = await queryExpiredBuilder.getCount();

    const queryBuilder = this.creditRepository.createQueryBuilder('credit')
      .select('credit.id')
      .where('status = 1')

    const activeCreditCount = await queryBuilder.getCount();
    return ({     
      "vencidos": expiredCount,
      "al corriente": activeCreditCount - expiredCount
    });
  }

  private async getCreditsByMonths(creditHistoryRepository: any): Promise<{ month: number; count: number }[]> {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const result = await creditHistoryRepository
      .createQueryBuilder("creditHistory")
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .select("MONTH(creditHistory.date) as month")
      .where("creditHistory.date >= :twelveMonthsAgo", { twelveMonthsAgo })
      .addSelect("COUNT(*) as count")
      .groupBy("month")
      .getRawMany();

    console.log("result", result);
    return result.sort((a, b) => a.month - b.month).map((row) => ({
      month: parseInt(row.month, 10),
      count: parseInt(row.count, 10),
    }));
  }

  private async getCreditsInPesosByMonths(creditHistoryRepository: any): Promise<{ month: number; count: number }[]> {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const result = await creditHistoryRepository
      .createQueryBuilder("creditHistory")
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .select("MONTH(creditHistory.date) as month")
      .where("creditHistory.date >= :twelveMonthsAgo", { twelveMonthsAgo })
      .andWhere("credit.typeCurrency = 'peso'")
      .addSelect("COUNT(*) as count")
      .groupBy("month")
      .getRawMany();

    console.log("result", result);
    return result.sort((a, b) => a.month - b.month).map((row) => ({
      month: parseInt(row.month, 10),
      count: parseInt(row.count, 10),
    }));
  }

  private async getCreditsInDolarsByMonths(creditHistoryRepository: any): Promise<{ month: number; count: number }[]> {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const result = await creditHistoryRepository
      .createQueryBuilder("creditHistory")
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .select("MONTH(creditHistory.date) as month")
      .where("creditHistory.date >= :twelveMonthsAgo", { twelveMonthsAgo })
      .andWhere("credit.typeCurrency = 'dolar'")
      .addSelect("COUNT(*) as count")
      .groupBy("month")
      .getRawMany();

    console.log("result", result);
    return result.sort((a, b) => a.month - b.month).map((row) => ({
      month: parseInt(row.month, 10),
      count: parseInt(row.count, 10),
    }));
  }

  private async getCreditAmountsByMonths(creditHistoryRepository: any, typeCurrency): Promise<{ month: number; count: number }[]> {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const result = await creditHistoryRepository
      .createQueryBuilder("creditHistory")
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .select('MONTH(creditHistory.date) as month, SUM(creditHistory.principal) as total')
      .where("creditHistory.date >= :twelveMonthsAgo", { twelveMonthsAgo })
      .andWhere("credit.typeCurrency = :typeCurrency", { typeCurrency })
      .groupBy('MONTH(date)')
      .getRawMany();

    console.log("result", result);
    return result.sort((a, b) => a.month - b.month).map((row) => ({
      month: parseInt(row.month, 10),
      count: parseInt(row.total, 10),
    }));
  }

  async getCreditsByDebtCollector(): Promise<any> {
    const personalCredits = await this.getCreditsByDebtCollectorByType(this.creditRepository);
    console.log("personalCredits: ", personalCredits);
    const saleCredits = await this.getCreditsByDebtCollectorByType(this.saleCreditRepository);
    console.log("saleCredits: ", saleCredits);
    return {
      personalCredits, saleCredits
    }
  }


  async getCreditsByDebtCollectorByType(creditRepository: any): Promise<any> {
    const credits = await creditRepository.createQueryBuilder('credit')
      .select('credit.debtCollector_id', 'debtCollectorId')
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .addSelect('COUNT(*)', 'creditCount')
      .andWhere('credit.status = :status', { status: StatusCredit.active })
      .groupBy('credit.debtCollector_id')
      .orderBy('credit.debtCollector_id')
      .getRawMany();

    const creditCounts = {};
    credits.sort((a, b) => {
      const nameComparison = a.debtCollector_name.localeCompare(b.debtCollector_name);

      if (nameComparison === 0) {
        return a.bdebtCollector_lastName.localeCompare(b.bdebtCollector_lastName);
      }

      return nameComparison;
    });

    credits.forEach(result => {
      creditCounts[`${result.debtCollector_name} ${result.debtCollector_lastName}`] = +result.creditCount;
    });

    return creditCounts;
  }

  async getPaymentBhavior(id: number, type: number, creditId: any) {
    var paymentBhavior = [];
    if (type == 1) {
      paymentBhavior = await this.getPaymentBhaviorByClient(id, this.creditHistoryRepository, creditId);
    } else {
      paymentBhavior = await this.getPaymentBhaviorByClient(id, this.saleCreditHistoryRepository, creditId);
    }
    console.log("paymentBhavior: ", paymentBhavior);
    return paymentBhavior;

  }

  async getPaymentBhaviorByClient(id: number, creditHistoryRepository: any, creditId: any): Promise<[]> {
    console.log("creditId: ", creditId);
    const queryBuilder = creditHistoryRepository.createQueryBuilder('creditHistory')
      .leftJoinAndSelect('creditHistory.credit', 'credit')
      .leftJoinAndSelect('creditHistory.paymentsDetail', 'paymentsDetail')
      .where('credit.client_id =:id', { id })
      .orderBy('creditHistory.id', 'DESC')

      if (creditId !== 'null') {
        queryBuilder.andWhere('credit.id = :creditId', { creditId });
      }

      return await queryBuilder.getMany();
  }

  async getProducts(category: string, startDate: any, endDate: any) {
    const ranges = getDateStartEnd(new Date(startDate), new Date(endDate));
    console.log("category: ", category);
    console.log("startDate: ", ranges.startDate);
    console.log("endDate: ", ranges.endDate);
    const products = await this.inventoryRepository.createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .select(['product.id as id',
        'product.name as name', 'product.name as name', 'SUM(inventory.amount * -1) as quantity'])
      .where("inventory.concept = :concept AND inventory.date BETWEEN :startDate and :endDate AND (:category = 'all' or product.category_id = :category)", { concept: 2, startDate: ranges.startDate, endDate: ranges.endDate, category })
      .groupBy('product.id, product.name')
      .orderBy('quantity', 'DESC')
      .getRawMany();

    console.log("products: ", products);
    return products;
  }
}
