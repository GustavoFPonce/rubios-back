import { ConsoleLogger, Injectable, NotFoundException } from '@nestjs/common';
import { Between, Brackets, Repository } from 'typeorm';
import { format, parseISO, formatISO, addWeeks, addMonths, addDays, subDays, parse } from 'date-fns';
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
    ) { }


    async create(creditCreateDto: CreditCreateDto, userId: number) {
        //console.log("creditCreate: ", creditCreateDto);
        var response = { success: false }
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
            balance: creditCreateDto.principal + (creditCreateDto.principal * creditCreateDto.interestRate / 100)

        };
        // console.log("credithistoryCreate: ", newCreditHistory);
        const creditHistorySaved = await this.addCreditHistory(newCreditHistory);
        //console.log("creditHistorySaved: ", creditHistorySaved);
        if (creditHistorySaved) {
            await this.addPaymentDetail(payments, creditHistorySaved, creditSaved);
            return response.success = true;
        }

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
        creditSaved.debtCollector = debtCollector;
        creditSaved.information = credit.information;
        creditSaved.typeCurrency = credit.typeCurrency;
        creditSaved.status = parseInt(`${StatusCredit[credit.status]}`);
        creditSaved.commission = credit.commission;
        const saved = await this.creditRepository.save(creditSaved);
        if (saved) response.success = true;
        return response;
        //return null;
    }



    async getAll(id: number) {
        var referenceDate = new Date();
        console.log("fecha de referencia: ", referenceDate);
        var argentinaTime = new Date(referenceDate.setHours(referenceDate.getHours() - 3));
        console.log("fecha argentina: ", argentinaTime);
        const startDate = new Date(referenceDate.setMonth(referenceDate.getMonth() - 1));
        const rangeDates = this.getStartDateEndDate(startDate, argentinaTime);
        console.log("fechas rangos: ", rangeDates);
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
        console.log("credits: ", creditsDto);

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
        const credit = await this.creditHistoryRepository.findOne({ where: { id }, relations: ['credit', 'paymentsDetail'] });
        console.log("credit: ", credit);
        const paymentsDetail = credit.paymentsDetail.map(x => {
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
            .addOrderBy('creditHistory.id', 'DESC')
            .getMany();

        //console.log("cobranzas obtenidas: ", collections);

        const collectionsDto = collections.map(payment => {
            return new CollectionDto(payment);
        })
        return collectionsDto
    }

    async getCollectionsByDayDebtCollector(userId: number, startDate: Date, endDate: Date, day: string) {
        console.log("userId: ", userId);
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
            .getMany();

        //console.log("cobranzas obtenidas: ", collections);

        const collectionsDto = collections.map(collection => {
            return new CollectionDto(collection);
        })
        return collectionsDto;
    }

    private getConditionsFilterByDay(startDate: Date, endDate: Date, day: string) {
        if (day == 'current') {
            console.log("estoy en current");
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

    async registerPayment(id: number, paymentAmount: number) {
        var response = { success: false, collection: {} };
        var payment = await this.paymentDetailRepository.createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where('paymentsDetail.id = :id', { id })
            .getOne();
        console.log('payment_ :', payment);
        payment.paymentDate = new Date();
        payment.actualPayment = paymentAmount;
        payment.balance = payment.balance - paymentAmount;
        const saved = await this.paymentDetailRepository.save(payment);
        console.log("saved: ", saved);
        if (saved) {
            response.success = true;
            response.collection = new CollectionDto(saved);
            this.uptadeBalanceNextPayment(payment.balance, payment.creditHistory.id, payment.creditHistory.credit.id);
            await this.updateBalanceCreditHistory(payment.creditHistory.id, paymentAmount);
        }
        return response;
    }

    private async updateBalanceCreditHistory(id: number, paymentAmount: number) {
        const creditHistory = await this.creditHistoryRepository.findOne(id);
        if (creditHistory) {
            creditHistory.balance = creditHistory.balance - paymentAmount;
            await this.creditHistoryRepository.save(creditHistory);
        }
    }

    private async uptadeBalanceNextPayment(balance: number, creditHistoryId: number, creditId: number) {
        const date = null;
        console.log("modificacion de saldo");
        var nextPayment = await this.paymentDetailRepository.createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .where('creditHistory.id = :creditHistoryId', { creditHistoryId })
            .andWhere('paymentsDetail.paymentDate IS NULL')
            .getOne();
        console.log("nextPayment: ", nextPayment);
        if (nextPayment) {
            nextPayment.balance = balance;
            const saved = await this.paymentDetailRepository.save(nextPayment);
        } else {
            this.cancelCredit(creditId);
        }

    }

    private async cancelCredit(id: number) {
        var credit = await this.creditRepository.findOne(id);
        if (credit) {
            credit.status = StatusCredit.canceled;
            await this.creditRepository.save(credit);
        }
    }

    async registerCancellationInterestPrincipal(id: number, paymentAmount: number, firstPayment: any) {
        let deletePaymentDetail = false;
        console.log("id: ", id);
        console.log("paymentAmount: ", paymentAmount);
        var response = { success: false, collection: {} };
        const paymentDetail = await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
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
        console.log("newFirstPayment: ", newFirstPayment);
        // this.getNextPaymenteDate(paymentDetail.creditHistory.credit.paymentFrequency, 2, paymentDetail.paymentDueDate);
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
        console.log("newCreditHistory: ", newCreditHistory);
        const creditHistorySaved = await this.addCreditHistory(newCreditHistory);
        var payments = [];
        var newPaymentDetail = new PaymentDetail();
        newPaymentDetail.payment = paymentAmount;
        newPaymentDetail.paymentDate = new Date();
        newPaymentDetail.paymentDueDate = new Date();
        newPaymentDetail.creditHistory = paymentDetail.creditHistory;
        newPaymentDetail.balance = 0.00;
        newPaymentDetail.accountabilityDate = null;
        newPaymentDetail.recoveryDateCommission = null;
        newPaymentDetail.actualPayment = paymentAmount;;
        newPaymentDetail.paymentType = PaymentType.cancellationInterest;
        console.log("new payment: ", newPaymentDetail);
        if (creditHistorySaved) {
            lastUpdateCreditHistory.status = StatusCreditHistory.notCurrent;
            await this.creditHistoryRepository.save(lastUpdateCreditHistory);
            this.newPaymentDetail(newPaymentDetail);
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
        currency: string,
        user: string,
        startDate: Date,
        endDate: Date,
        statusPayment: string) {
        const areDateEqual = this.areDatesEqual(startDate, endDate);
        var collections: any;
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

    async searchCollectionsByConditions(statusCredit: string, currency: string, startDate: Date, endDate: Date, statusPayment: string, areDateEqual: boolean) {
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
            .orWhere('creditHistory.credit_id = credit.id AND creditHistory.status = 2 AND paymentsDetail.paymentType = 2')
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .getMany();
    }

    async searchCollectionsByUserByConditions(statusCredit: string, currency: string, user: number, startDate: Date, endDate: Date, statusPayment: string, areDateEqual: boolean) {
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
            .orWhere('creditHistory.credit_id = credit.id AND creditHistory.status = :status AND paymentsDetail.paymentType = :type AND credit.debtCollector.id = :user', { status: 2, type: '2', user })
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .getMany();
    }

    private getConditionsFilterCollections(statusCredit: string, currency: string, startDate: Date, endDate: Date, statusPayment: string, areDateEqual: boolean) {
        console.log("estado de credito: ", statusCredit);
        const commonConditions = qb2 => {
            if (currency != 'all') qb2.andWhere('credit.typeCurrency = :currency', { currency });
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
        const credit = await this.creditRepository.findOne({ where: { id: id }, relations: ['debtCollector', 'client', 'creditHistory'] });
        if (!credit) {
            throw new NotFoundException(`No se encontró el crédito con el id: ${id}`);
        };

        return new CreditListDto(credit);
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
            // .orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate AND credit.client.id = :client', {
            //     startDate,
            //     endDate,
            //     client
            // })
            .addOrderBy('creditHistory.date', 'DESC')
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
            // .orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate AND credit.client.id = :client AND credit.debtCollector.id = :userId', {
            //     startDate,
            //     endDate,
            //     client,
            //     userId
            // })
            .leftJoinAndSelect('credit.client', 'client')
            .addOrderBy('creditHistory.date', 'DESC')
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
}
