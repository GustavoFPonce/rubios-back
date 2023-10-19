import { ConsoleLogger, Injectable, NotFoundException } from '@nestjs/common';
import { Between, Brackets, Repository, Transaction } from 'typeorm';
import { format, parseISO, formatISO, addWeeks, addMonths, addDays, subDays, parse, subMonths } from 'date-fns';
import { es } from 'date-fns/locale'
import { Credit } from './entities/credit.entity';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { CreditCreateDto } from './dto/credit-create-dto';
import { PaymentType, StatusCredit, StatusCreditHistory, StatusPayment } from './enum';
import { PaymentDetail } from './entities/payment-detail.entity';
import { CreditSavedDto } from './dto/credit-saved-dto';
import { User } from 'src/user/entities/user.entity';
import { CreditListDto } from './dto/credit-list.dto';
import { Client } from 'src/client/entities/client.entity';
import { CollectionDto } from './dto/collection-dto';
import { PaymentDetailDto } from './dto/payment-detail-dto';
import { CreditHistory } from './entities/credit-history.entity';
import { CreditHistoryCreateDto } from './dto/credit-history-create-dto';
import { CreditHistoryDto } from './dto/credit-history-dto';
import { PaymentDetailCreateDto } from './dto/payment-detaill-create-dto';
import { CreditEditDto } from './dto/credit-edit-dto';
import { Cash } from 'src/cash/entities/cash.entity';
import { CashService } from '../cash/cash.service';
import { ExpenseCreateDto, ExpenseType } from 'src/cash/dto/expense-create-dto';
import { CreditTransactionCreateDto } from 'src/cash/dto/credit-transaction-create-dto';
import { TransactionType } from '../cash/dto/enum';
import { CreditTransactionDetail } from '../cash/entities/credit-transaction-detail.entity';
import { CreditTransaction } from '../cash/entities/credit-transaction.entity';
import { CreditTransactionDto } from 'src/cash/dto/credit-transactions-dto';

@Injectable()
export class CreditService {
    constructor(
        @InjectRepository(Credit)
        private readonly creditRepository: Repository<Credit>,
        @InjectRepository(PaymentDetail)
        private paymentDetailRepository: Repository<PaymentDetail>,
        @InjectRepository(CreditHistory)
        private creditHistoryRepository: Repository<CreditHistory>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Client)
        private clientRepository: Repository<Client>,
        @InjectRepository(Cash)
        private cashRepository: Repository<Cash>,
        private readonly cashService: CashService,
        @InjectRepository(CreditTransactionDetail)
        private creditTransactionDetailRepository: Repository<CreditTransactionDetail>,
        @InjectRepository(CreditTransaction)
        private creditTransactionRepository: Repository<CreditTransaction>
    ) { }


    async create(creditCreateDto: CreditCreateDto, userId: number) {
        //console.log("creditCreate: ", creditCreateDto);
        var response = { success: false }

        var lastCash = await this.cashRepository.findOne({ order: { id: 'DESC' } });
        if (!lastCash || lastCash.closingDate != null) {
            lastCash = (await this.cashService.openCash()).cash;
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        const dateFirstPayment = parseISO(creditCreateDto.firstPayment);
        const debtCollector = await this.userRepository.findOne(creditCreateDto.debtCollectorId);
        const client = await this.clientRepository.findOne(creditCreateDto.clientId);
        const payments = creditCreateDto.paymentsDetail;
        var createCredit = new Credit();
        createCredit.userId = userId;
        createCredit.client = client;
        createCredit.debtCollector = debtCollector;
        createCredit.paymentFrequency = creditCreateDto.paymentFrequency;
        createCredit.interestRate = creditCreateDto.interestRate;
        createCredit.status = StatusCredit.active;
        createCredit.numberPayment = creditCreateDto.numberPayment;
        createCredit.information = creditCreateDto.information;
        createCredit.typeCurrency = creditCreateDto.typeCurrency;
        createCredit.commission = creditCreateDto.commission;
        const credit = this.creditRepository.create(createCredit);
        const creditSaved = await this.creditRepository.save(credit);
        if (creditSaved) await this.createTransaction(creditSaved, lastCash, creditCreateDto.principal, user);
        const newCreditHistory: CreditHistoryCreateDto = {
            date: parseISO(creditCreateDto.date),
            principal: creditCreateDto.principal,
            interest: creditCreateDto.principal * creditCreateDto.interestRate / 100,
            credit: creditSaved,
            firstPayment: parseISO(creditCreateDto.firstPayment),
            payDay: this.getDayString(dateFirstPayment),
            payment: creditCreateDto.payment,
            status: StatusCreditHistory.current,
            accounted: false,
            commissionPaymentDetail: null,
            balance: creditCreateDto.balance

        };
        // console.log("credithistoryCreate: ", newCreditHistory);
        const creditHistorySaved = await this.addCreditHistory(newCreditHistory);
        //console.log("creditHistorySaved: ", creditHistorySaved);
        if (creditHistorySaved) {
            await this.addPaymentDetail(payments, creditHistorySaved, creditSaved);
            response.success = true;
        }

        return response;
    }

    private async createTransaction(credit: Credit, cash: Cash, amount: number, user: User) {
        var newTransaction = new CreditTransactionCreateDto(credit.client, credit, cash, amount, 'Crédito Personal', TransactionType.credit, user, true);
        const response = await this.cashService.createTransaction(newTransaction);
        return response;
    }

    private async addCreditHistory(creditHistory: CreditHistoryCreateDto) {
        const newCreditHistory = this.creditHistoryRepository.create(creditHistory);
        return await this.creditHistoryRepository.save(newCreditHistory);
    }


    private async addPaymentDetail(paymentsDetail: PaymentDetailCreateDto[], creditHistorySaved: CreditHistory, credit: Credit) {
        if (paymentsDetail.length > 0) {
            for (let i = 0; i < paymentsDetail.length; i++) {
                var detail = new PaymentDetail();
                detail.payment = paymentsDetail[i].payment;
                detail.paymentDueDate = new Date(paymentsDetail[i].paymentDueDate);
                detail.paymentDate = (paymentsDetail[i].paymentDate) ? new Date(paymentsDetail[i].paymentDate) : null;
                detail.creditHistory = creditHistorySaved;
                detail.actualPayment = (paymentsDetail[i].paymentDate) ? paymentsDetail[i].payment : 0.00;
                detail.balance = (paymentsDetail[i].status == StatusPayment.cancelled) ? parseFloat(((creditHistorySaved.payment * credit.numberPayment) - paymentsDetail[i].payment * (i + 1)).toFixed(2))
                    : (i == 0) ? parseFloat((creditHistorySaved.payment * credit.numberPayment).toFixed(2)) : parseFloat((await this.getBalanceLastPaymentDetailCancelled(creditHistorySaved.id)));
                detail.paymentType = PaymentType.paymentInstallments;
                detail.isNext = ((i == 0 && paymentsDetail[i].status == StatusPayment.active) || (paymentsDetail[i].status == StatusPayment.active && paymentsDetail[i - 1].status == StatusPayment.cancelled)) ? true : false;
                const paymentDetail = this.paymentDetailRepository.create(detail);
                const responsePaymentDetail = await this.paymentDetailRepository.save(paymentDetail);
            };
        } else {
            for (let i = 0; i < credit.numberPayment; i++) {
                var detail = new PaymentDetail();
                detail.payment = creditHistorySaved.payment;
                detail.paymentDueDate = (i == 0) ? new Date(creditHistorySaved.firstPayment) : this.getNextPaymenteDate(credit.paymentFrequency, i, creditHistorySaved.firstPayment);
                detail.paymentDate = null;
                detail.actualPayment = 0.00;
                detail.creditHistory = creditHistorySaved;
                detail.balance = parseFloat((creditHistorySaved.payment * credit.numberPayment).toFixed(2));
                detail.paymentType = PaymentType.paymentInstallments;
                detail.isNext = (i == 0) ? true : false;
                const paymentDetail = this.paymentDetailRepository.create(detail);
                const responsePaymentDetail = await this.paymentDetailRepository.save(paymentDetail);
            };
        }

    }

    private async getBalanceLastPaymentDetailCancelled(id: number) {
        const result = await this.paymentDetailRepository
            .createQueryBuilder('paymentDetail')
            .where('paymentDetail.credit_history_id = :id', { id })
            .orderBy('paymentDetail.paymentDueDate', 'DESC') // Ordenar por fecha de forma descendente
            .getOne(); // Obtener solo un registro (el último)
        //console.log("result payment balance: ", result);
        return result.balance.toString();
    }

    private getNextPaymenteDate(frequency: string, periodNumber: number, firstPayment: Date): Date {
        switch (frequency) {
            case 'Un pago':
                return firstPayment;
            case 'Semanal':
                return addDays(firstPayment, 7 * periodNumber);
            case 'Quincenal':
                return addDays(firstPayment, 15 * periodNumber);
            case 'Mensual':
                return addMonths(firstPayment, 1 * periodNumber);
            default:
                throw new Error('Frecuencia de pago no válida.');
        }
    }



    async update(id: number, credit: CreditSavedDto) {
        console.log("credit a editar: ", credit);
        var response = { success: false };
        const debtCollector = await this.userRepository.findOne(credit.debtCollectorId);
        var creditSaved = await this.creditRepository.findOne(credit.id);
        const creditHistorySaved = await this.creditHistoryRepository.findOne({ where: { credit: id, status: 1 }, relations: ['credit', 'paymentsDetail'] });
        creditSaved.numberPayment = credit.numberPayment;
        creditSaved.paymentFrequency = credit.paymentFrequency;
        creditSaved.debtCollector = debtCollector;
        creditSaved.information = credit.information;
        creditSaved.typeCurrency = credit.typeCurrency;
        creditSaved.status = parseInt(`${StatusCredit[credit.status]}`);
        creditSaved.commission = credit.commission;
        creditSaved.interestRate = credit.interestRate;
        const updateCreditSaved = await this.creditRepository.save(creditSaved);
        //console.log("update credit: ", updateCreditSaved);
        const updateCreditHistorySaved = await this.updateCreditHistory(creditHistorySaved, credit);
        //console.log("updateCreditHistorySaved: ", updateCreditHistorySaved);
        if (credit.paymentsDetail) await this.updatePaymentsDetail(id, credit.paymentsDetail);
        if (updateCreditSaved) response.success = true;
        return response;
        //return null;
    }

    private async updateCreditHistory(creditHistory: CreditHistory, credit: CreditSavedDto) {
        console.log("balance: ", credit.balance);
        creditHistory.date = parseISO(credit.date);
        creditHistory.principal = credit.principal;
        creditHistory.interest = credit.principal * credit.interestRate / 100;
        creditHistory.firstPayment = parseISO(credit.firstPayment);
        creditHistory.payDay = this.getDayString(new Date(credit.firstPayment));
        creditHistory.payment = credit.payment;
        creditHistory.status = StatusCredit[credit.status];
        creditHistory.accounted = false;
        creditHistory.balance = (!credit.balance) ? creditHistory.balance : credit.balance;
        return await this.creditHistoryRepository.save(creditHistory);
    }

    private async updatePaymentsDetail(creditId: number, paymentsDetail: PaymentDetailCreateDto[]) {
        var response = { success: false, error: '' };
        const creditHistory = await this.creditHistoryRepository.findOne({ where: { credit: creditId, status: 1 }, relations: ['credit', 'paymentsDetail'] });
        //console.log('creditHistory update: ', creditHistory);

        for (const payment of creditHistory.paymentsDetail) {
            const responseDelete = await this.deletePayment(payment.id);
            if (responseDelete.affected > 0) response.success = true;
        };
        if (response.success) {
            const responseUpdatePayments = await this.addPaymentDetail(paymentsDetail, creditHistory, creditHistory.credit);
        }
    }


    private async deletePayment(id: number) {
        return await this.paymentDetailRepository.delete(id);
    }


    async getAll(id: number) {
        var referenceDate = new Date();
        //console.log("fecha de referencia: ", referenceDate);
        var argentinaTime = referenceDate;
        //new Date(referenceDate.setHours(referenceDate.getHours() - 3));
        //console.log("fecha argentina: ", argentinaTime);
        //const startDate = new Date(referenceDate.setMonth(referenceDate.getMonth() - 1));
        // const rangeDates = this.getStartDateEndDate(startDate, argentinaTime);
        const rangeDates = { startDate: subMonths(argentinaTime, 1), endDate: argentinaTime };
        //console.log("fechas rangos: ", rangeDates);
        const user = await this.userRepository.findOne({ where: { id: id }, relations: ['role'] });
        // console.log("usuario encontrado: ", user);
        const conditions = new Brackets((qb) => {
            if (user.role.name == 'admin') {
                //console.log("estoy en admin")
                qb.where('creditHistory.date BETWEEN :startDate AND :endDate', {
                    startDate: rangeDates.startDate,
                    endDate: rangeDates.endDate,
                })
            } else {
                //console.log("estoy en debt")
                qb.where('credit.debtCollector.id = :user AND creditHistory.date BETWEEN :startDate AND :endDate', {
                    user: user.id,
                    startDate: rangeDates.startDate,
                    endDate: rangeDates.endDate,
                })
            }
        })
        var credits = [];
        credits = await this.creditRepository
            .createQueryBuilder('credit')
            .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .where(conditions)
            .andWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(CreditHistory, 'creditHistory')
                    .where('creditHistory.credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.client', 'client')
            //.leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .orderBy('creditHistory.date', 'DESC')
            .addOrderBy('creditHistory.id', 'DESC')
            .getMany();


        const creditsDto = credits.map(credit => {
            const creditList = new CreditListDto(credit);
            return creditList;
        })
        //console.log("credits: ", creditsDto);

        return creditsDto;
    }

    async searchCredits(
        status: string,
        user: string,
        currency: string,
        frequency: string,
        start: Date,
        end: Date) {
        //console.log("user service: ", user);
        const conditions = new Brackets((qb) => {
            qb.where('creditHistory.date BETWEEN :startDate AND :endDate', {
                startDate: start,
                endDate: end,
            })
            if (currency != 'all') {
                qb.andWhere('credit.typecurrency = :currency', {
                    currency
                })
            }
            if (status != 'all') {
                qb.andWhere('credit.status = :status', {
                    status
                })
            }
            if (frequency != 'all') {
                qb.andWhere('credit.paymentFrequency = :frequency', {
                    frequency
                })
            }
        })

        var credits: any;
        if (user == 'all') {
            // console.log("buscando por todos");
            credits = await this.searchCreditsByConditions(conditions);
        } else {
            credits = await this.searchCreditsByConditionsByUser(conditions, parseInt(user));
            // console.log("credits: ", credits);
        };
        const creditsDto = this.getCreditsListDto(credits);

        //console.log("creditos activos: ", creditsDto);
        return creditsDto;
    }


    async searchCreditsByConditionsByUser(conditions: any, user: number) {
        return await this.creditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .where(conditions)
            .andWhere('credit.debtCollector_Id = :user', { user })
            .andWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(CreditHistory, 'creditHistory')
                    .where('creditHistory.credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .andWhere('credit.debtCollector_Id = :user', { user })
            .orderBy('creditHistory.date', 'DESC')
            .getMany();
    }

    async searchCreditsByConditions(conditions: any) {
        //console.log("condiciones: ", conditions);
        return await this.creditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .where(conditions)
            .andWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(CreditHistory, 'creditHistory')
                    .where('creditHistory.credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .orderBy('creditHistory.date', 'DESC')
            .getMany();

    }

    async getByClient(client: number, userId: number) {
        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        if (client) {
            var credits = [];
            if (user.role.name == 'admin') {
                credits = await this.getByClientAdminRole(client);
            } else {
                credits = await this.getByClientDebtCollectorRole(client, userId)
            }
            const creditsDto = this.getCreditsListDto(credits);
            return creditsDto;
        } else {
            return this.getAll(userId);
        }

    }

    private async getByClientAdminRole(client: number) {
        return await this.creditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .where('credit.client.id = :client', { client })
            .addOrderBy('creditHistory.date', 'DESC')
            .getMany();
    }

    private async getByClientDebtCollectorRole(client: number, userId: number) {
        return await this.creditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .where('credit.client.id = :client AND credit.debtCollector.id = :userId', { client, userId })
            .addOrderBy('creditHistory.date', 'DESC')
            .getMany();
    }

    // async getByClientName(name: string) {
    //     const filters = name.split(' ');
    //     console.log("filters: ", filters);
    //     const credits = await this.creditRepository.createQueryBuilder('credit')
    //         .leftJoinAndSelect('credit.client', 'client')
    //         .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
    //         .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
    //         .where(new Brackets((qb) => {
    //             filters.forEach((term, index) => {
    //                 if (term != 'de') {
    //                     qb.orWhere('client.name LIKE :term' + index, { ['term' + index]: `%${term}%` })
    //                         .orWhere('client.lastName LIKE :term' + index, { ['term' + index]: `%${term}%` });
    //                 }
    //             });
    //         }))
    //         .orderBy('creditHistory.date', 'DESC')
    //         .getMany();
    //     //console.log("creditos: ", credits);
    //     const creditsDto = this.getCreditsListDto(credits);
    //     // console.log("creditos: ", creditsDto);
    //     return creditsDto;
    // }

    private getCreditsListDto(credits: Credit[]): CreditListDto[] {
        return credits.map(credit => {
            const creditList = new CreditListDto(credit);
            return creditList;
        })
    }

    async getPaymentsDetail(id: number): Promise<PaymentDetailDto[]> {
        const credit = await this.creditHistoryRepository.findOne({
            where: { id },
            relations: ['credit', 'paymentsDetail']
        });
        console.log("credit: ", credit);
        const paymentsDetail = credit.paymentsDetail.sort((a, b) => {
            if (a.paymentDueDate.getTime() !== b.paymentDueDate.getTime()) {
                return a.paymentDueDate.getTime() - b.paymentDueDate.getTime();
            }
            return b.id - a.id;
        })
            .map(x => {
                return new PaymentDetailDto(x, credit.interest);
            });
        return paymentsDetail;
    }

    async delete(id: number) {
        var response = { success: false }
        const responseDelete = await this.creditRepository.delete(id);
        console.log("response: ", responseDelete);
        if (responseDelete.affected > 0) response.success = true;
        return response;
    }

    async getDay() {
        //return this.getDayString(date);
        const date = new Date();
        return {
            day: this.getDayString(date),
            date: date
        }
    }

    //get collections by day

    async getCollectionsByDate(userId: number, dateQuery: string) {
        const dateCurrentLocalObject = new Date();
        var argentinaTime = new Date(dateQuery);
        const dayType = (this.areDatesEqual(argentinaTime, dateCurrentLocalObject)) ? 'current' : 'not-current';
        // argentinaTime = new Date(argentinaTime.setHours(argentinaTime.getHours() - 3));
        const startDate = this.getStartDateEndDate(argentinaTime, argentinaTime).startDate;
        const endDate = this.getStartDateEndDate(argentinaTime, argentinaTime).endDate;
        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        if (user.role.name == "admin") {
            return await this.getCollectionsByDayAdmin(startDate, endDate, dayType);
        } else {
            return await this.getCollectionsByDayDebtCollector(userId, startDate, endDate, dayType);
        }

    }

    async getCollectionsByDayAdmin(startDate: Date, endDate: Date, day: string) {
        var collections = await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(CreditHistory, 'creditHistory')
                    .where('creditHistory.credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .andWhere(this.getConditionsFilterByDay(startDate, endDate, day))
            .orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
            .leftJoinAndSelect('credit.client', 'client')
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .addOrderBy('creditHistory.date', 'ASC')
            .getMany();

        //console.log("cobranzas obtenidas: ", collections);

        const collectionsDto = collections.map(payment => {
            return new CollectionDto(payment);
        })
        return collectionsDto
    }

    async getCollectionsByDayDebtCollector(userId: number, startDate: Date, endDate: Date, day: string) {
        var collections = await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(CreditHistory, 'creditHistory')
                    .where('creditHistory.credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .andWhere('credit.debtCollector.id = :userId', { userId })
            .andWhere(this.getConditionsFilterByDay(startDate, endDate, day))
            .andWhere('credit.debtCollector.id = :userId', { userId })
            .orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
            .andWhere('credit.debtCollector.id = :userId', { userId })
            .leftJoinAndSelect('credit.client', 'client')
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .addOrderBy('creditHistory.date', 'ASC')
            .getMany();

        //console.log("cobranzas obtenidas: ", collections);

        const collectionsDto = collections.map(collection => {
            return new CollectionDto(collection);
        })
        return collectionsDto;
    }

    private getConditionsFilterByDay(startDate: Date, endDate: Date, day: string) {
        if (day == 'current') {
            //  console.log("estoy en current");
            return new Brackets((qb) => {
                qb.orWhere('paymentsDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate,
                })
                    .orWhere(
                        '(paymentsDetail.paymentDueDate <= :startDate AND paymentsDetail.paymentDate IS NULL)',
                        { startDate }
                    )
                    .orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate', {
                        startDate,
                        endDate,
                    })
            })
        } else {
            console.log("estoy en not-current");
            return new Brackets((qb) => {
                qb.orWhere('paymentsDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate,
                })
            })
        }
    }

    ///

    private getDayString(date: Date) {
        return format(date, 'EEEE', { locale: es });
    }


    //register payments

    async registerTrasactionAndPayment(id: number, paymentAmount: number, userId: number) {
        var response = { success: false, collection: {} };

        var lastCash = await this.cashRepository.findOne({ order: { id: 'DESC' } });
        if (!lastCash || lastCash.closingDate != null) {
            lastCash = (await this.cashService.openCash()).cash;
        }
        var payment = await this.paymentDetailRepository.createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where('paymentsDetail.id = :id', { id })
            .getOne();
        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        var concept = (paymentAmount > payment.payment) ? 'Pago de multiples cuotas' : 'Pago de cuota';
        const transaction = await this.registerCreditTransaction(paymentAmount, payment, user, lastCash, concept, TransactionType.payment);
        console.log("transacci{on registrada: ", transaction);
        await this.registerPayment(payment, paymentAmount, transaction, user.role.name);
        return response;
    }

    private async registerPayment(payment: PaymentDetail, paymentAmount: number, transaction: CreditTransaction | null, role: string) {
        var response = { success: false, error: '' };
        payment.paymentDate = new Date();
        payment.actualPayment = (paymentAmount <= payment.payment) ? paymentAmount : payment.payment;
        payment.isNext = false;
        const paymentPending = payment.payment - paymentAmount;
        const saved = await this.paymentDetailRepository.save(payment);
        var creditTransactionDetail = new CreditTransactionDetail();
        creditTransactionDetail.creditTransaction = transaction;
        creditTransactionDetail.paymentId = payment.id;
        creditTransactionDetail.paymentDueDate = payment.paymentDueDate;
        creditTransactionDetail.paymentDate = payment.paymentDate;
        creditTransactionDetail.payment = payment.payment;
        creditTransactionDetail.actualPayment = payment.actualPayment;
        const responseSaved = await this.creditTransactionDetailRepository.save(creditTransactionDetail);
        if (saved) {
            response.success = true;
            //response.collection = new CollectionDto(saved);
            const creditHistoryUpdate = await this.updateBalanceCreditHistory(payment.creditHistory.id, payment.actualPayment);
            if (creditHistoryUpdate) {
                if (paymentPending > 0) {
                    await this.addPendingPayment(paymentPending, payment.creditHistory, payment.paymentDueDate);

                } else {
                    if (payment.creditHistory.credit.numberPayment != 1) await this.updateStatusIsNextPayment(payment.id, true, payment.creditHistory.id);
                    if (paymentPending < 0) {
                        const paymentNext = await this.getPaymentNext(creditHistoryUpdate.id);
                        console.log("paymentNext: ", paymentNext);
                        if (paymentNext) await this.registerPayment(paymentNext, -paymentPending, transaction, role);
                    }
                }
                response.success = true;
            }
        }

    }

    private async getPaymentNext(crediHistoryId: number) {
        const payment = await this.paymentDetailRepository.createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .where('paymentsDetail.credit_history_id = :id AND paymentsDetail.isNext = :isNext', { id: crediHistoryId, isNext: true })
            .getOne();
        console.log("payment siguiente: ", payment);
        return payment;
    }

    private async registerCreditTransaction(paymentAmount: number, payment: PaymentDetail, user: User, lastCash: Cash, concept: string, transactionType: TransactionType) {
        const accounted = (user.role.name == 'admin') ? true : false;
        const creditTransactionCreateDto = new CreditTransactionCreateDto(payment.creditHistory.credit.client,
            payment.creditHistory.credit, lastCash, paymentAmount, concept, transactionType, user, accounted);
        const responseSavedTrasaction = await this.cashService.createTransaction(creditTransactionCreateDto);
        return responseSavedTrasaction;
    }


    private async addPendingPayment(paymentPending: number, creditHistory: CreditHistory, date: Date) {
        var payment = new PaymentDetail();
        payment.payment = paymentPending;
        payment.paymentDueDate = addDays(date, 1);
        payment.paymentDate = null;
        payment.paymentType = PaymentType.paymentInstallments;
        payment.accountabilityDate = null;
        payment.creditHistory = creditHistory;
        payment.recoveryDateCommission = null;
        payment.actualPayment = 0.00;
        payment.balance = creditHistory.balance;
        payment.isNext = true;
        const responseAdd = await this.paymentDetailRepository.save(payment);
        console.log("response add payment pending: ", responseAdd);
    }


    private async updateStatusIsNextPayment(paymentId: number, isNext: boolean, id: number) {
        try {
            const creditHistory = await this.creditHistoryRepository.findOne({ where: { id }, relations: ['paymentsDetail', 'paymentsDetail.creditHistory'], order: { id: 'ASC' } });

            const payments = creditHistory.paymentsDetail.sort((a, b) => {
                if (a.paymentDueDate.getTime() !== b.paymentDueDate.getTime()) {
                    return a.paymentDueDate.getTime() - b.paymentDueDate.getTime();
                }
            });


            const paymentCurrent = payments.find(x => x.id == paymentId);
            const indexPaymentCurrent = payments.findIndex(x => x.id == paymentId);
            console.log("indexPaymentCurrent", indexPaymentCurrent)
            if (indexPaymentCurrent != -1) {
                var paymentNext = payments[indexPaymentCurrent + 1];
                if (!paymentNext) {
                    const paymentPreviousIndex = payments.findIndex(x => x.paymentDate.toISOString().substr(0, 10) === subDays(paymentCurrent.paymentDueDate, 1).toISOString().substr(0, 10) &&
                        parseFloat(x.payment.toString()) == parseFloat(paymentCurrent.payment.toString()) + parseFloat(x.actualPayment.toString()) &&
                        x.creditHistory.id == paymentCurrent.creditHistory.id);
                    if (paymentPreviousIndex != -1) paymentNext = payments[paymentPreviousIndex + 1];
                    await this.setNextPayment(paymentNext, isNext);
                } else {
                    await this.setNextPayment(paymentNext, isNext);
                }
            }
        } catch (err) {
            console.log("Error al establecer proximo pago: ", err);
        }
    }

    private async setNextPayment(paymentNext: PaymentDetail, isNext: boolean) {
        paymentNext.isNext = isNext;
        console.log("payment siguiente: ", paymentNext);
        const responseUpdatePayment = await this.paymentDetailRepository.save(paymentNext);
        console.log("response establecer siguiente pago: ", responseUpdatePayment);

    }

    private async updateBalanceCreditHistory(id: number, paymentAmount: number) {
        var creditHistory = await this.creditHistoryRepository.findOne({ where: { id }, relations: ['credit'] });
        if (creditHistory) {
            creditHistory.balance = creditHistory.balance - paymentAmount;
            const creditHistoryUpdate = await this.creditHistoryRepository.save(creditHistory);
            if (creditHistoryUpdate.balance == 0) {
                this.cancelCredit(creditHistory.credit.id);
            } else {
                this.setStatusActiveCredit(creditHistory.credit.id);
            };
            creditHistory = creditHistoryUpdate;
        };

        return creditHistory;
    }

    private async setStatusActiveCredit(id: number) {
        const credit = await this.creditRepository.findOne(id);
        if (credit) {
            credit.status = StatusCredit.active;
            await this.creditRepository.save(credit);
        }
    }

    private async cancelCredit(id: number) {
        var credit = await this.creditRepository.findOne({ where: { id }, relations: ['client'] });
        if (credit) {
            credit.status = StatusCredit.canceled;
            await this.creditRepository.save(credit);
        };
        await this.deleteClientNumber(credit.client?.id)
    }

    private async deleteClientNumber(id: number) {
        const exists = await this.creditRepository.findOne({ where: { client: id, status: StatusCredit.active } });
        if (!exists) {
            const client = await this.clientRepository.findOne(id);
            client.clientNumber = null;
            this.clientRepository.save(client);
        }
    }

    async cancelRegisteredPayment(id: number, userId: number) {
        var response = { success: false, collection: {} };
        var lastCash = await this.cashRepository.findOne({ order: { id: 'DESC' } });
        if (!lastCash || lastCash.closingDate != null) {
            lastCash = (await this.cashService.openCash()).cash;
        }
        var payment = await this.paymentDetailRepository.findOne({ where: { id }, relations: ['creditHistory', 'creditHistory.credit', 'creditHistory.credit.client'] });
        console.log("payment here: ", payment)
        const isPartialPayment = parseFloat(payment.payment.toString()) > parseFloat(payment.actualPayment.toString());
        const actualPayment = payment.actualPayment;
        const amountPaymentPartial = payment.payment - payment.actualPayment;
        console.log("amountPaymentPartial")
        const paymentDate = addDays(payment.paymentDueDate, 1);
        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        var concept = 'Cancelación pago de cuota';
        const transaction = await this.registerCreditTransaction(actualPayment, payment, user, lastCash, concept, TransactionType.cancellationPayment);
        var creditTransactionDetail = new CreditTransactionDetail();
        creditTransactionDetail.creditTransaction = transaction;
        creditTransactionDetail.paymentId = payment.id;
        creditTransactionDetail.paymentDueDate = payment.paymentDueDate;
        creditTransactionDetail.paymentDate = payment.paymentDate;
        creditTransactionDetail.payment = payment.payment;
        creditTransactionDetail.actualPayment = payment.actualPayment;
        const responseSaved = await this.creditTransactionDetailRepository.save(creditTransactionDetail);
        payment.actualPayment = 0.00;
        payment.paymentDate = null;
        payment.isNext = true;
        const saved = await this.paymentDetailRepository.save(payment);
        if (saved) {
            response.success = true;
            if (isPartialPayment) {
                const paymentPartial = await this.paymentDetailRepository.findOne({ where: { payment: amountPaymentPartial, paymentDueDate: paymentDate } })
                await this.paymentDetailRepository.delete(paymentPartial.id);
            } else {
                if (payment.creditHistory.credit.numberPayment != 1) await this.updateStatusIsNextPayment(payment.id, false, payment.creditHistory.id);
            }
            const creditHistoryUpdate = await this.updateBalanceCreditHistory(payment.creditHistory.id, (-actualPayment));
        }
        return response;
    }

    async cancelRegisteredPaymentInterest(id: number, userId: number) {
        var response = { success: false, collection: {} };
        var lastCash = await this.cashRepository.findOne({ order: { id: 'DESC' } });
        if (!lastCash || lastCash.closingDate != null) {
            lastCash = (await this.cashService.openCash()).cash;
        }
        var payment = await this.paymentDetailRepository.findOne({ where: { id }, relations: ['creditHistory', 'creditHistory.credit', 'creditHistory.credit.client'] });
        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        var concept = 'Cancelación pago de interés';
        const transaction = await this.registerCreditTransaction(payment.payment, payment, user, lastCash, concept, TransactionType.cancellationPaymentInterest);
        var creditTransactionDetail = new CreditTransactionDetail();
        creditTransactionDetail.creditTransaction = transaction;
        creditTransactionDetail.paymentId = payment.id;
        creditTransactionDetail.paymentDueDate = payment.paymentDueDate;
        creditTransactionDetail.paymentDate = payment.paymentDate;
        creditTransactionDetail.payment = payment.payment;
        creditTransactionDetail.actualPayment = payment.actualPayment;
        const responseSavedTransaction = await this.creditTransactionDetailRepository.save(creditTransactionDetail);
        console.log("responseSavedTransaction: ", responseSavedTransaction);
        payment.payment = payment.creditHistory.payment;
        payment.paymentDueDate = payment.creditHistory.firstPayment;
        payment.paymentType = 1;
        payment.actualPayment = 0.00;
        payment.paymentDate = null;
        payment.isNext = true;
        const responseUpdatePayment = await this.paymentDetailRepository.save(payment);
        const creditId = payment.creditHistory.credit.id;
        const removeCreditHistoryRenewed = await this.removeCreditHistoryRenewed(creditId);
        if (removeCreditHistoryRenewed) await this.updateStatusCreditHistory(creditId);
        const saved = await this.paymentDetailRepository.save(payment);
        if (responseSavedTransaction && responseUpdatePayment && saved) response.success = true;
        return response;
    }

    async removeCreditHistoryRenewed(id: number) {
        const creditHistory = await this.creditHistoryRepository.createQueryBuilder('creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .where('creditHistory.status =:status AND credit.id =:id', { status: 1, id })
            .orderBy('creditHistory.date', 'DESC')
            .getOne();
        const responseRemoveCreditHistoryRenewed = await this.creditHistoryRepository.delete(creditHistory.id);
        console.log("responseRemoveCreditHistoryRenewed: ", responseRemoveCreditHistoryRenewed);
        return responseRemoveCreditHistoryRenewed;
    }

    async updateStatusCreditHistory(id: number) {
        const creditHistory = await this.creditHistoryRepository.createQueryBuilder('creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .where('creditHistory.status =:status AND credit.id =:id', { status: 2, id })
            .orderBy('creditHistory.date', 'DESC')
            .getOne();
        console.log("creditHistory: ", creditHistory);
        creditHistory.status = 1;
        const responseUpdateCreditHistory = await this.creditHistoryRepository.save(creditHistory);
        console.log("responseUpdateCreditHistory: ", responseUpdateCreditHistory);

    }

    async registerCancellationInterestPrincipal(id: number, paymentAmount: number, firstPayment: any, userId: number) {
        var lastCash = await this.cashRepository.findOne({ order: { id: 'DESC' } });
        if (!lastCash || lastCash.closingDate != null) {
            lastCash = (await this.cashService.openCash()).cash;
        }
        let deletePaymentDetail = false;
        var response = { success: false, collection: {} };
        const paymentDetail = await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .where('paymentsDetail.id = :id', { id })
            .getOne();

        console.log("paymentDetail: ", paymentDetail);
        if (!paymentDetail) {
            throw new NotFoundException(`No se encontro el pago con el id: ${id}`);
        };
        const lastUpdateCreditHistory: any = paymentDetail.creditHistory;
        var principal = parseFloat(lastUpdateCreditHistory.principal);
        if (paymentAmount <= parseFloat(lastUpdateCreditHistory.interest)) {
            principal = principal + (parseFloat(lastUpdateCreditHistory.interest) - paymentAmount)
        } else {
            principal = principal - (paymentAmount - parseFloat(lastUpdateCreditHistory.interest));
        };
        if (paymentDetail.creditHistory.credit.paymentFrequency == 'Un pago') deletePaymentDetail = true;
        var interest = principal * paymentDetail.creditHistory.credit.interestRate / 100;
        const newFirstPayment = new Date(firstPayment);
        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        var concept = (paymentAmount > paymentDetail.creditHistory.interest) ? 'Pago de interés y reducción de capital' :
            ((paymentAmount == paymentDetail.creditHistory.interest) ? 'Pago de interés' : 'Pago de interés y capitalización de intereses');
        const transaction = await this.registerCreditTransaction(paymentAmount, paymentDetail, user, lastCash, concept, TransactionType.paymentInterest);
        var newCreditHistory: CreditHistoryCreateDto = {
            date: new Date(),
            principal: principal,
            interest: interest,
            credit: paymentDetail.creditHistory.credit,
            firstPayment: newFirstPayment,
            payDay: this.getDayString(newFirstPayment),
            payment: (principal + interest) / paymentDetail.creditHistory.credit.numberPayment,
            status: StatusCreditHistory.current,
            accounted: false,
            commissionPaymentDetail: null,
            balance: principal + interest
        };
        var payments = [];
        var newPaymentDetail = new PaymentDetail();
        newPaymentDetail.payment = paymentAmount;
        newPaymentDetail.paymentDate = new Date();
        newPaymentDetail.paymentDueDate = new Date();
        newPaymentDetail.creditHistory = paymentDetail.creditHistory;
        newPaymentDetail.balance = 0.00;
        newPaymentDetail.accountabilityDate = null;
        newPaymentDetail.recoveryDateCommission = null;
        newPaymentDetail.actualPayment = paymentAmount;
        newPaymentDetail.paymentType = PaymentType.cancellationInterest;
        newPaymentDetail.isNext = false;
        const creditHistorySaved = await this.addCreditHistory(newCreditHistory);
        const payment = await this.newPaymentDetail(newPaymentDetail);
        var creditTransactionDetail = new CreditTransactionDetail();
        creditTransactionDetail.creditTransaction = transaction;
        creditTransactionDetail.paymentId = payment.id;
        creditTransactionDetail.paymentDueDate = payment.paymentDueDate;
        creditTransactionDetail.paymentDate = payment.paymentDate;
        creditTransactionDetail.payment = payment.payment;
        creditTransactionDetail.actualPayment = payment.actualPayment;
        const responseSaved = await this.creditTransactionDetailRepository.save(creditTransactionDetail);
        console.log("creditHistorySaved: ", creditHistorySaved);
        if (creditHistorySaved) {
            lastUpdateCreditHistory.status = StatusCreditHistory.notCurrent;
            await this.creditHistoryRepository.save(lastUpdateCreditHistory);
            this.addPaymentDetail(payments, creditHistorySaved, paymentDetail.creditHistory.credit);
            response.success = true;

        }
        if (deletePaymentDetail) await this.paymentDetailRepository.delete(paymentDetail.id);
        return response;
    }


    private async newPaymentDetail(newPaymentDetail: PaymentDetail) {
        const paymentDetail = this.paymentDetailRepository.create(newPaymentDetail);
        return await this.paymentDetailRepository.save(paymentDetail);
    }


    // get collections by filters

    async searchCollections(
        userId: string,
        statusCredit: string,
        currency: string,
        user: string,
        start: Date,
        end: Date,
        statusPayment: string
    ) {
        const startDate = this.getStartDateEndDate(start, end).startDate;
        const endDate = this.getStartDateEndDate(start, end).endDate;
        const userLogged = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        const collections = await this.getCollectionsByUserRole(userLogged, statusCredit, currency, user, startDate, endDate, statusPayment);
        const collectionsDto = collections.map(collection => {
            return new CollectionDto(collection);
        })
        return collectionsDto
    }

    private async getCollectionsByUserRole(userLogged: User,
        statusCredit: string,
        currencyType: string,
        user: string,
        startDate: Date,
        endDate: Date,
        statusPayment: string) {
        const areDateEqual = this.areDatesEqual(startDate, endDate);
        var collections: any;
        const currency = (currencyType == 'all') ? ['peso', 'dolar'] : [currencyType];
        if (userLogged.role.name == "admin") {
            if (user == 'all') {
                collections = await this.searchCollectionsByConditions(statusCredit, currency, startDate, endDate, statusPayment, areDateEqual);
            } else {
                collections = await this.searchCollectionsByUserByConditions(statusCredit, currency, parseInt(user), startDate, endDate, statusPayment, areDateEqual);

            };
        } else {
            console.log("entrando por aqui 1");
            collections = await this.searchCollectionsByUserByConditions(statusCredit, currency, parseInt(userLogged.id), startDate, endDate, statusPayment, areDateEqual);

        }
        return collections;
    }

    async searchCollectionsByConditions(statusCredit: string, currency: string[], startDate: Date, endDate: Date, statusPayment: string, areDateEqual: boolean) {
        return await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.client', 'client')
            .where(this.getConditionsFilterCollections(statusCredit, currency, startDate, endDate, statusPayment, areDateEqual))
            .andWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(CreditHistory, 'creditHistory')
                    .where('creditHistory.credit_id = credit.id AND creditHistory.status = 1')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .orWhere('creditHistory.credit_id = credit.id AND creditHistory.status = 2 AND paymentsDetail.paymentType = 2 AND paymentsDetail.paymentDate BETWEEN :startDate AND :endDate AND credit.typeCurrency IN (:...currency)', { currency, startDate, endDate })
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .getMany();
    }

    async searchCollectionsByUserByConditions(statusCredit: string, currency: string[], user: number, startDate: Date, endDate: Date, statusPayment: string, areDateEqual: boolean) {
        return await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .andWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(CreditHistory, 'creditHistory')
                    .where('creditHistory.credit_id = credit.id AND creditHistory.status = 1')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .leftJoinAndSelect('credit.client', 'client')
            .andWhere('credit.debtCollector.id = :user', { user })
            .andWhere(this.getConditionsFilterCollections(statusCredit, currency, startDate, endDate, statusPayment, areDateEqual))
            .orWhere('creditHistory.credit_id = credit.id AND creditHistory.status = :status AND paymentsDetail.paymentType = :type AND paymentsDetail.paymentDate BETWEEN :startDate AND :endDate AND credit.debtCollector.id = :user AND credit.typeCurrency IN (:...currency)', { status: 2, type: '2', user, currency, startDate, endDate })
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .getMany();
    }

    private getConditionsFilterCollections(statusCredit: string, currency: string[], startDate: Date, endDate: Date, statusPayment: string, areDateEqual: boolean) {
        console.log("estado de credito: ", statusCredit);
        const commonConditions = qb2 => {
            // if (currency != 'all') qb2.andWhere('credit.typeCurrency = :currency', { currency });
            qb2.andWhere('credit.typeCurrency IN (:...currency)', { currency });
            if (statusPayment == 'canceled') qb2.andWhere('paymentsDetail.paymentDate IS NOT NULL');
            if (statusPayment == 'active') qb2.andWhere('paymentsDetail.paymentDate IS NULL');

        }
        var conditions: any;
        if (statusCredit == StatusCredit.active.toString()) {
            conditions = new Brackets((qb) => {
                if (areDateEqual) {
                    console.log("estoy en son iguales: ", areDateEqual);
                    qb.where(
                        qb2 => {
                            qb2.where(
                                '(paymentsDetail.paymentDueDate <= :startDate AND paymentsDetail.paymentDate IS NULL)',
                                { startDate }
                            );
                            commonConditions(qb2);
                            qb2.andWhere('credit.status = :statusCredit', { statusCredit })
                            qb2.orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate', {
                                startDate,
                                endDate,
                            })
                            commonConditions(qb2)
                            qb2.orWhere(
                                '(paymentsDetail.paymentDueDate >= :startDate AND paymentsDetail.paymentDueDate <= :endDate)',
                                { startDate, endDate }
                            );
                            commonConditions(qb2);
                            qb2.andWhere('credit.status = :statusCredit', { statusCredit })
                        }
                    )
                } else {
                    qb.where(
                        qb2 => {
                            qb2.orWhere('paymentsDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
                                startDate,
                                endDate,
                            })
                            commonConditions(qb2)
                        }
                    )
                }
            });
        } else {
            console.log("soy no activo");
            conditions = new Brackets((qb) => {
                qb.where(
                    qb2 => {
                        qb2.orWhere('paymentsDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
                            startDate,
                            endDate,
                        })
                        commonConditions(qb2)
                    }
                )
            })
        }
        return conditions;

    }

    private areDatesEqual(start: Date, end: Date) {
        return (
            start.getFullYear() === end.getFullYear() &&
            start.getMonth() === end.getMonth() &&
            start.getUTCDate() === end.getUTCDate()
        );
    }

    async getById(id: string) {
        const credit = await this.creditRepository.findOne({ where: { id: id }, relations: ['debtCollector', 'client', 'creditHistory', 'creditHistory.paymentsDetail'] });
        if (!credit) {
            throw new NotFoundException(`No se encontró el crédito con el id: ${id}`);
        };
        const creditHistory = credit.creditHistory[credit.creditHistory.length - 1];
        const paymentsDetailDto = creditHistory.paymentsDetail.map(x => {
            return new PaymentDetailDto(x, creditHistory.interest)
        });

        return new CreditEditDto(credit, paymentsDetailDto);
    }

    async getCreditsHistory(id: string) {
        const creditsHistory = await this.creditHistoryRepository.find({
            where: { credit: id }, order: {
                date: 'DESC',
                id: 'DESC'
            }
        });
        const creditsHistoryDto = creditsHistory.map(credit => {
            return new CreditHistoryDto(credit);
        });

        // console.log("creditsHistoryDto: ", creditsHistoryDto);
        return creditsHistoryDto;
    }

    async getCollectionsByClient(client: number, userId: number, date: string) {
        const dateCurrentLocalObject = new Date();
        var argentinaTime = new Date(date);
        const dayType = (this.areDatesEqual(argentinaTime, dateCurrentLocalObject)) ? 'current' : 'not-current';
        // argentinaTime = new Date(argentinaTime.setHours(argentinaTime.getHours() - 3));
        const startDate = this.getStartDateEndDate(argentinaTime, argentinaTime).startDate;
        const endDate = this.getStartDateEndDate(argentinaTime, argentinaTime).endDate;
        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        console.log("admin?: ", user.role.name);
        if (client) {
            var collections = [];
            if (user.role.name == 'admin') {
                collections = await this.getCollectionsByClientAdminRole(client, startDate, endDate, dayType);
            } else {
                collections = await this.getCollectionsByClientDebtCollectorRole(client, startDate, endDate, dayType, userId)
            }
            const collectionsDto = collections.map(collection => {
                return new CollectionDto(collection);
            })
            return collectionsDto
        } else {
            return this.getCollectionsByDate(userId, date);
        }

    }

    private async getCollectionsByClientAdminRole(client: number, startDate: Date, endDate: Date, day: string) {
        return await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(CreditHistory, 'creditHistory')
                    .where('creditHistory.credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            //.andWhere(this.getConditionsFilterByDay(startDate, endDate, day))
            .andWhere('credit.client.id = :client', { client })
            .orWhere('paymentsDetail.paymenttype  = :type AND credit.client.id = :client', {
                type: 2,
                client
            })
            .addOrderBy('paymentsDetail.paymentDueDate', 'ASC')
            .addOrderBy('creditHistory.date', 'ASC')
            .leftJoinAndSelect('credit.client', 'client')
            .getMany();
    }

    private async getCollectionsByClientDebtCollectorRole(client: number, startDate: Date, endDate: Date, day: string, userId: number) {
        return await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(CreditHistory, 'creditHistory')
                    .where('creditHistory.credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            //.andWhere(this.getConditionsFilterByDay(startDate, endDate, day))
            .andWhere('credit.debtCollector.id = :userId AND credit.client.id = :client', { userId, client })
            .orWhere('paymentsDetail.paymentType  = :type AND credit.client.id = :client AND credit.debtCollector.id = :userId', {
                type: 2,
                client,
                userId
            })
            .leftJoinAndSelect('credit.client', 'client')
            .addOrderBy('paymentsDetail.paymentDueDate', 'ASC')
            .addOrderBy('creditHistory.date', 'ASC')
            .getMany();
    }


    private getStartDateEndDate(start: Date, end: Date) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        startDate.setHours(0, 0, 0, 0);
        startDate.setMinutes(startDate.getMinutes() - startDate.getTimezoneOffset());
        endDate.setHours(23, 59, 59, 999);
        endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset());
        return {
            startDate, endDate
        }
    }

    async getTransactions(id: number) {
        const transactions = await this.creditTransactionRepository.createQueryBuilder('creditTransactions')
            .leftJoinAndSelect('creditTransactions.client', 'client')
            .leftJoinAndSelect('creditTransactions.credit', 'credit')
            .where('creditTransactions.credit_id = :id', { id })
            .getMany();
        console.log("transactions: ", transactions);
        return transactions.map(x => {
            return new CreditTransactionDto(x, x.credit);
        })
    }

    async reschedulePayment(id: number, newDate: Date) {
        const payment = await this.paymentDetailRepository.findOne(id);
        if (payment) {
            payment.paymentDueDate = newDate;
            await this.paymentDetailRepository.save(payment);
        }
    }


}
