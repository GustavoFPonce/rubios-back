import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SaleCredit } from './entities/sale-credit.entity';
import { Brackets, Repository } from 'typeorm';
import { SaleCreditCreateDto } from './dto/sale-credit-create-dto';
import { Sale } from 'src/sale/entities/sale.entity';
import { CreditHistoryCreateDto } from 'src/credit/dto/credit-history-create-dto';
import { PaymentType, StatusCredit, StatusCreditHistory, StatusPayment } from 'src/credit/enum';
import { addDays, addMonths, format, parseISO, subDays } from 'date-fns';
import { User } from 'src/user/entities/user.entity';
import { Client } from 'src/client/entities/client.entity';
import { es } from 'date-fns/locale';
import { SaleDetailDto } from '../sale/dto/sale-detail-dto';
import { SaleCreditHistory } from './entities/sale-credit-history.entity';
import { PaymentDetailCreateDto } from 'src/credit/dto/payment-detaill-create-dto';
import { PaymentDetailSaleCredit } from './entities/payment-detail-sale-credit.entity';
import { getDateStartEnd } from 'src/common/get-date-start-end';
import { SaleCreditListDto } from './dto/sale-credit-list-dto';
import { CreditListDto } from 'src/credit/dto/credit-list.dto';
import { CreditHistoryDto } from 'src/credit/dto/credit-history-dto';
import { PaymentDetailDto } from 'src/credit/dto/payment-detail-dto';
import { CollectionDto } from 'src/credit/dto/collection-dto';
import { CreditEditDto } from 'src/credit/dto/credit-edit-dto';
import { PaymentDetail } from 'src/credit/entities/payment-detail.entity';

@Injectable()
export class SaleCreditService {
    constructor(
        @InjectRepository(SaleCredit)
        private saleCreditRepository: Repository<SaleCredit>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Client)
        private clientRepository: Repository<Client>,
        @InjectRepository(SaleCreditHistory)
        private saleCreditHistoryRepository: Repository<SaleCreditHistory>,
        @InjectRepository(PaymentDetailSaleCredit)
        private paymentDetailSaleCreditRepository: Repository<PaymentDetailSaleCredit>,
    ) { }


    async create(creditCreateDto: SaleCreditCreateDto, userId: number, sale: Sale) {
        console.log("creditCreateDto: ", creditCreateDto);
        var response = { success: false }
        const dateFirstPayment = parseISO(creditCreateDto.firstPayment);
        const debtCollector = await this.userRepository.findOne(creditCreateDto.debtCollectorId);
        const client = await this.clientRepository.findOne(creditCreateDto.clientId);
        const payments = creditCreateDto.paymentsDetail;;
        var createCredit = new SaleCredit();
        createCredit.userId = userId;
        createCredit.client = client;
        createCredit.debtCollector = debtCollector;
        createCredit.paymentFrequency = creditCreateDto.paymentFrequency;
        createCredit.interestRate = creditCreateDto.interestRate;
        createCredit.status = StatusCredit.active;
        createCredit.numberPayment = creditCreateDto.numberPayment;
        createCredit.information = '';
        createCredit.typeCurrency = 'peso';
        createCredit.commission = creditCreateDto.commission;
        createCredit.sale = sale;
        const credit = this.saleCreditRepository.create(createCredit);
        //console.log("credit: ", credit);
        const creditSaved = await this.saleCreditRepository.save(credit);
        // console.log("creditSaved: ", creditSaved);
        // console.log("balance: ", creditCreateDto.balance);
        const newCreditHistory: CreditHistoryCreateDto = {
            date: new Date(creditCreateDto.date),
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
        //console.log("newCreditHistory: ", newCreditHistory);
        const creditHistorySaved = await this.addCreditHistory(newCreditHistory);
        //console.log("creditHistorySaved: ", creditHistorySaved);
        if (creditHistorySaved) {
            await this.addPaymentDetail(payments, creditHistorySaved, creditSaved);
            return response.success = true;
        }

        return response;
    }

    private async addCreditHistory(creditHistory: CreditHistoryCreateDto) {
        const newCreditHistory = this.saleCreditHistoryRepository.create(creditHistory);
        return await this.saleCreditHistoryRepository.save(newCreditHistory);
    }


    private async addPaymentDetail(paymentsDetail: PaymentDetailCreateDto[], creditHistorySaved: SaleCreditHistory, credit: SaleCredit) {
        if (paymentsDetail.length > 0) {
            for (let i = 0; i < paymentsDetail.length; i++) {
                var detail = new PaymentDetailSaleCredit();
                detail.payment = paymentsDetail[i].payment;
                detail.paymentDueDate = new Date(paymentsDetail[i].paymentDueDate);
                detail.paymentDate = (paymentsDetail[i].paymentDate) ? new Date(paymentsDetail[i].paymentDate) : null;
                detail.creditHistory = creditHistorySaved;
                detail.actualPayment = (paymentsDetail[i].paymentDate) ? paymentsDetail[i].payment : 0.00;
                detail.balance = (paymentsDetail[i].status == StatusPayment.cancelled) ? parseFloat(((creditHistorySaved.payment * credit.numberPayment) - paymentsDetail[i].payment * (i + 1)).toFixed(2))
                    : (i == 0) ? parseFloat((creditHistorySaved.payment * credit.numberPayment).toFixed(2)) : parseFloat((await this.getBalanceLastPaymentDetailCancelled(creditHistorySaved.id)));
                detail.paymentType = PaymentType.paymentInstallments;
                detail.isNext = ((i == 0 && paymentsDetail[i].status == StatusPayment.active) || (paymentsDetail[i].status == StatusPayment.active && paymentsDetail[i - 1].status == StatusPayment.cancelled)) ? true : false;
                const paymentDetail = this.paymentDetailSaleCreditRepository.create(detail);
                const responsePaymentDetail = await this.paymentDetailSaleCreditRepository.save(paymentDetail);
            };
        } else {
            for (let i = 0; i < credit.numberPayment; i++) {
                var detail = new PaymentDetailSaleCredit();
                detail.payment = creditHistorySaved.payment;
                detail.paymentDueDate = (i == 0) ? new Date(creditHistorySaved.firstPayment) : this.getNextPaymenteDate(credit.paymentFrequency, i, creditHistorySaved.firstPayment);
                detail.paymentDate = null;
                detail.actualPayment = 0.00;
                detail.creditHistory = creditHistorySaved;
                detail.balance = parseFloat((creditHistorySaved.payment * credit.numberPayment).toFixed(2));
                detail.paymentType = PaymentType.paymentInstallments;
                detail.isNext = (i == 0) ? true : false;
                const paymentDetail = this.paymentDetailSaleCreditRepository.create(detail);
                const responsePaymentDetail = await this.paymentDetailSaleCreditRepository.save(paymentDetail);
            };
        }

    }

    private async getBalanceLastPaymentDetailCancelled(id: number) {
        const result = await this.paymentDetailSaleCreditRepository
            .createQueryBuilder('paymentDetail')
            .where('paymentDetail.sale_credit_history_id = :id', { id })
            .orderBy('paymentDetail.paymentDueDate', 'DESC') // Ordenar por fecha de forma descendente
            .getOne(); // Obtener solo un registro (el último)
        // console.log("result payment balance: ", result);
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

    private getDayString(date: Date) {
        return format(date, 'EEEE', { locale: es });
    }

    async annulSaleCredit(saleId: number) {
        var response = { success: false, error: '' };
        const saleCredit = await this.saleCreditRepository.findOne({ where: { sale: saleId } });
        saleCredit.status = StatusCredit.annulled;
        const updateCredit = await this.saleCreditRepository.save(saleCredit);
        if (updateCredit) response.success = true;
        return response;
    }

    async getAll(id: number) {
        var referenceDate = new Date();
        var argentinaTime = new Date(referenceDate.setHours(referenceDate.getHours() - 3));
        const startDate = new Date(referenceDate.setMonth(referenceDate.getMonth() - 1));
        const rangeDates = getDateStartEnd(startDate, argentinaTime);
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
        credits = await this.saleCreditRepository
            .createQueryBuilder('credit')
            .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .where(conditions)
            .andWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(SaleCreditHistory, 'creditHistory')
                    .where('creditHistory.sale_credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.client', 'client')
            //.leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .orderBy('creditHistory.date', 'DESC')
            .addOrderBy('creditHistory.id', 'DESC')
            .getMany();

        //console.log("credits: ", credits);
        const creditsDto = credits.map(credit => {
            const creditList = new CreditListDto(credit);
            return creditList;
        })

        return creditsDto;
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
        return await this.saleCreditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .where('credit.client.id = :client', { client })
            .addOrderBy('creditHistory.date', 'DESC')
            .getMany();
    }

    private async getByClientDebtCollectorRole(client: number, userId: number) {
        return await this.saleCreditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .where('credit.client.id = :client AND credit.debtCollector.id = :userId', { client, userId })
            .addOrderBy('creditHistory.date', 'DESC')
            .getMany();
    }

    private getCreditsListDto(credits: SaleCredit[]): CreditListDto[] {
        return credits.map(credit => {
            const creditList = new CreditListDto(credit);
            return creditList;
        })
    }

    async getById(id: string) {
        const credit = await this.saleCreditRepository.findOne({ where: { id: id }, relations: ['debtCollector', 'client', 'creditHistory', 'creditHistory.paymentsDetail'] });
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
        const creditsHistory = await this.saleCreditHistoryRepository.find({
            where: { credit: id }, order: {
                date: 'DESC',
                id: 'DESC'
            }
        });
        const creditsHistoryDto = creditsHistory.map(credit => {
            return new CreditHistoryDto(credit);
        });

        //console.log("creditsHistoryDto: ", creditsHistoryDto);
        return creditsHistoryDto;
    }

    async getPaymentsDetail(id: number): Promise<PaymentDetailDto[]> {
        const credit = await this.saleCreditHistoryRepository.findOne({ where: { id }, relations: ['credit', 'paymentsDetail'] });
        //console.log("credit: ", credit);
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


    async update(id: number, credit: any) {
        console.log("credit a editar: ", credit);
        var response = { success: false };
        const debtCollector = await this.userRepository.findOne(credit.debtCollectorId);
        var creditSaved = await this.saleCreditRepository.findOne(credit.id);
        creditSaved.debtCollector = debtCollector;
        creditSaved.information = credit.information;
        creditSaved.typeCurrency = credit.typeCurrency;
        creditSaved.status = parseInt(`${StatusCredit[credit.status]}`);
        creditSaved.commission = credit.commission;
        const saved = await this.saleCreditRepository.save(creditSaved);
        if (saved) response.success = true;
        return response;
        //return null;
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
        return await this.saleCreditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .where(conditions)
            .andWhere('credit.debtCollector_Id = :user', { user })
            .andWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(SaleCreditHistory, 'creditHistory')
                    .where('creditHistory.sale_credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .andWhere('credit.debtCollector_Id = :user', { user })
            .orderBy('creditHistory.date', 'DESC')
            .getMany();
    }

    async searchCreditsByConditions(conditions: any) {
        //console.log("condiciones: ", conditions);
        return await this.saleCreditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
            .where(conditions)
            .andWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(SaleCreditHistory, 'creditHistory')
                    .where('creditHistory.sale_credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .orderBy('creditHistory.date', 'DESC')
            .getMany();

    };


    async getCollectionsByDate(userId: number, dateQuery: string) {
        const dateCurrentLocalObject = new Date();
        var argentinaTime = new Date(dateQuery);
        const dayType = (this.areDatesEqual(argentinaTime, dateCurrentLocalObject)) ? 'current' : 'not-current';
        // argentinaTime = new Date(argentinaTime.setHours(argentinaTime.getHours() - 3));
        const startDate = getDateStartEnd(argentinaTime, argentinaTime).startDate;
        const endDate = getDateStartEnd(argentinaTime, argentinaTime).endDate;
        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        if (user.role.name == "admin") {
            return await this.getCollectionsByDayAdmin(startDate, endDate, dayType);
        } else {
            return await this.getCollectionsByDayDebtCollector(userId, startDate, endDate, dayType);
        }

    }

    async getCollectionsByDayAdmin(startDate: Date, endDate: Date, day: string) {
        var collections = await this.paymentDetailSaleCreditRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(SaleCreditHistory, 'creditHistory')
                    .where('creditHistory.sale_credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .andWhere(this.getConditionsFilterByDay(startDate, endDate, day))
            .orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate AND credit.status != :status', {
                startDate,
                endDate,
                status: StatusCredit.annulled
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
        var collections = await this.paymentDetailSaleCreditRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(SaleCreditHistory, 'creditHistory')
                    .where('creditHistory.sale_credit_id = credit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .andWhere('credit.debtCollector.id = :userId', { userId })
            .andWhere(this.getConditionsFilterByDay(startDate, endDate, day))
            .andWhere('credit.debtCollector.id = :userId', { userId })
            .orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate AND credit.status != :status', {
                startDate,
                endDate,
                status: StatusCredit.annulled
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
            //  console.log("estoy en current");
            return new Brackets((qb) => {
                qb.orWhere('paymentsDetail.paymentDueDate BETWEEN :startDate AND :endDate AND credit.status != :status', {
                    startDate,
                    endDate,
                    status: StatusCredit.annulled
                })
                    .orWhere(
                        '(paymentsDetail.paymentDueDate <= :startDate AND paymentsDetail.paymentDate IS NULL AND credit.status != :status)',
                        { startDate, status: StatusCredit.annulled }
                    )
                    .orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate AND credit.status != :status', {
                        startDate,
                        endDate,
                        status: StatusCredit.annulled
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
    };

    private areDatesEqual(start: Date, end: Date) {
        return (
            start.getFullYear() === end.getFullYear() &&
            start.getMonth() === end.getMonth() &&
            start.getUTCDate() === end.getUTCDate()
        );
    }


    async searchCollections(
        userId: string,
        statusCredit: string,
        currency: string,
        user: string,
        start: Date,
        end: Date,
        statusPayment: string
    ) {
        const startDate = getDateStartEnd(start, end).startDate;
        const endDate = getDateStartEnd(start, end).endDate;
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
        return await this.paymentDetailSaleCreditRepository
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
                    .from(SaleCreditHistory, 'creditHistory')
                    .where('creditHistory.sale_credit_id = credit.id AND creditHistory.status = 1')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .orWhere('creditHistory.sale_credit_id = credit.id AND creditHistory.status = 2 AND paymentsDetail.paymentType = 2')
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .getMany();
    }

    async searchCollectionsByUserByConditions(statusCredit: string, currency: string, user: number, startDate: Date, endDate: Date, statusPayment: string, areDateEqual: boolean) {
        return await this.paymentDetailSaleCreditRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .andWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(SaleCreditHistory, 'creditHistory')
                    .where('creditHistory.sale_credit_id = credit.id AND creditHistory.status = 1')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .leftJoinAndSelect('credit.client', 'client')
            .andWhere('credit.debtCollector.id = :user', { user })
            .andWhere(this.getConditionsFilterCollections(statusCredit, currency, startDate, endDate, statusPayment, areDateEqual))
            .orWhere('creditHistory.sale_credit_id = credit.id AND creditHistory.status = :status AND paymentsDetail.paymentType = :type AND credit.debtCollector.id = :user', { status: 2, type: '2', user })
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


    async getCollectionsByClient(client: number, userId: number, date: string) {
        const dateCurrentLocalObject = new Date();
        var argentinaTime = new Date(date);
        const dayType = (this.areDatesEqual(argentinaTime, dateCurrentLocalObject)) ? 'current' : 'not-current';
        // argentinaTime = new Date(argentinaTime.setHours(argentinaTime.getHours() - 3));
        const startDate = getDateStartEnd(argentinaTime, argentinaTime).startDate;
        const endDate = getDateStartEnd(argentinaTime, argentinaTime).endDate;
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
        return await this.paymentDetailSaleCreditRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(SaleCreditHistory, 'creditHistory')
                    .where('creditHistory.sale_credit_id = credit.id')
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
        return await this.paymentDetailSaleCreditRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(SaleCreditHistory, 'creditHistory')
                    .where('creditHistory.sale_credit_id = credit.id')
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
    };

    async registerPayment(id: number, paymentAmount: number) {
        var response = { success: false, collection: {} };
        var payment = await this.paymentDetailSaleCreditRepository.createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where('paymentsDetail.id = :id', { id })
            .getOne();
        //console.log('payment_ :', payment);
        payment.paymentDate = new Date();
        payment.actualPayment = paymentAmount;
        payment.balance = payment.balance - paymentAmount;
        payment.isNext = false;
        payment.creditHistory.balance = payment.creditHistory.balance - paymentAmount;
        const paymentPending = payment.payment - paymentAmount;
        const saved = await this.paymentDetailSaleCreditRepository.save(payment);
        //console.log("saved: ", saved);
        if (saved) {
            response.success = true;
            response.collection = new CollectionDto(saved);
            const creditHistoryUpdate = await this.updateBalanceCreditHistory(payment.creditHistory.id, paymentAmount);
            if (paymentPending > 0 && creditHistoryUpdate) {
                await this.addPendingPayment(paymentPending, payment.creditHistory);
            } else {
                await this.updateStatusIsNextPayment(payment.id, true, payment.creditHistory.id);
            }
        }
        return response;
    }

    private async addPendingPayment(paymentPending: number, creditHistory: SaleCreditHistory) {
        var payment = new PaymentDetail();
        payment.payment = paymentPending;
        payment.paymentDueDate = addDays(new Date(), 1);
        payment.paymentDate = null;
        payment.paymentType = PaymentType.paymentInstallments;
        payment.accountabilityDate = null;
        payment.creditHistory = creditHistory;
        payment.recoveryDateCommission = null;
        payment.actualPayment = 0.00;
        payment.isNext = true;
        payment.balance = creditHistory.balance;
        const responseAdd = await this.paymentDetailSaleCreditRepository.save(payment);
        console.log("response add payment pending: ", responseAdd);
    }

    // private async updateStatusIsNextPayment(paymentId: number, isNext: boolean, id: number) {
    //     try {
    //         const creditHistory = await this.saleCreditHistoryRepository.findOne({ where: { id }, relations: ['paymentsDetail'], order: { id: 'ASC' } });
    //         //console.log("payments: ", creditHistory.paymentsDetail);
    //         const payments = creditHistory.paymentsDetail;
    //         const indexPaymentCurrent = payments.findIndex(x => x.id == paymentId);
    //         const paymentNextId = payments[indexPaymentCurrent + 1].id
    //         const paymentNext = await this.paymentDetailSaleCreditRepository.findOne({ where: { id: paymentNextId }, relations: ['creditHistory'] });
    //         if (indexPaymentCurrent != -1 && paymentNext) {
    //             paymentNext.isNext = isNext;
    //             console.log("payment siguiente: ", paymentNext);
    //             const responseUpdatePayment = await this.paymentDetailSaleCreditRepository.save(paymentNext);
    //             console.log("response establecer siguiente pago: ", responseUpdatePayment);
    //         }
    //     } catch (err) {
    //         console.log("Error al establecer proximo pago: ", err);
    //     }
    // }

    private async updateStatusIsNextPayment(paymentId: number, isNext: boolean, id: number) {
        try {
            const creditHistory = await this.saleCreditHistoryRepository.findOne({ where: { id }, relations: ['paymentsDetail', 'paymentsDetail.creditHistory'], order: { id: 'ASC' } });

            const payments = creditHistory.paymentsDetail;
            const paymentCurrent = payments.find(x => x.id == paymentId);
            const indexPaymentCurrent = payments.findIndex(x => x.id == paymentId);
            if (indexPaymentCurrent != -1) {
                var paymentNext = payments[indexPaymentCurrent + 1];
                if (!paymentNext) {
                    const paymentPreviousIndex = payments.findIndex(x => x.paymentDate.toISOString().substr(0, 10) === subDays(paymentCurrent.paymentDueDate, 1).toISOString().substr(0, 10) && parseFloat(x.payment.toString()) == parseFloat(paymentCurrent.payment.toString()) + parseFloat(x.actualPayment.toString()) && x.creditHistory.id == paymentCurrent.creditHistory.id);
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
        const responseUpdatePayment = await this.paymentDetailSaleCreditRepository.save(paymentNext);
        console.log("response establecer siguiente pago: ", responseUpdatePayment);

    }

    private async updateBalanceCreditHistory(id: number, paymentAmount: number) {
        console.log("pago modificación del saldo: ", paymentAmount)
        const creditHistory = await this.saleCreditHistoryRepository.findOne(id);
        if (creditHistory) {
            creditHistory.balance = creditHistory.balance - paymentAmount;
            return await this.saleCreditHistoryRepository.save(creditHistory);
        }
    }

    private async uptadeBalanceNextPayment(balance: number, creditHistoryId: number, creditId: number) {
        const date = null;
        // console.log("modificacion de saldo");
        var nextPayment = await this.paymentDetailSaleCreditRepository.createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.creditHistory', 'creditHistory')
            .leftJoinAndSelect('creditHistory.credit', 'credit')
            .where('creditHistory.id = :creditHistoryId', { creditHistoryId })
            .andWhere('paymentsDetail.paymentDate IS NULL')
            .getOne();
        console.log("nextPayment: ", nextPayment);
        if (nextPayment) {
            nextPayment.balance = balance;
            const saved = await this.paymentDetailSaleCreditRepository.save(nextPayment);
        } else {
            this.cancelCredit(creditId);
        }

    }

    private async cancelCredit(id: number) {
        var credit = await this.saleCreditRepository.findOne(id);
        if (credit) {
            credit.status = StatusCredit.canceled;
            await this.saleCreditRepository.save(credit);
        }
    }

    async cancelRegisteredPayment(id: number) {
        var response = { success: false, collection: {} };
        var payment = await this.paymentDetailSaleCreditRepository.findOne({ where: { id }, relations: ['creditHistory', 'creditHistory.credit'] });
        const isPartialPayment = payment.payment > payment.actualPayment;
        const actualPayment = payment.actualPayment;
        const amountPaymentPartial = payment.payment - payment.actualPayment;
        const paymentDate = addDays(payment.paymentDate, 1);
        payment.actualPayment = 0.00;
        payment.paymentDate = null;
        payment.isNext = true;
        const saved = await this.paymentDetailSaleCreditRepository.save(payment);
        if (saved) {
            response.success = true;
            if (isPartialPayment) {
                const paymentPartial = await this.paymentDetailSaleCreditRepository.findOne({ where: { payment: amountPaymentPartial, paymentDueDate: paymentDate } })
                this.paymentDetailSaleCreditRepository.delete(paymentPartial.id);
            } else {
                await this.updateStatusIsNextPayment(payment.id, false, payment.creditHistory.id);
            }
            const creditHistoryUpdate = await this.updateBalanceCreditHistory(payment.creditHistory.id, (-actualPayment));

        }
        return response;
    }



    async registerCancellationInterestPrincipal(id: number, paymentAmount: number, firstPayment: any) {
        let deletePaymentDetail = false;
        console.log("id: ", id);
        console.log("paymentAmount: ", paymentAmount);
        var response = { success: false, collection: {} };
        const paymentDetail = await this.paymentDetailSaleCreditRepository
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
        console.log("ultimo credit history: ", lastUpdateCreditHistory);
        var principal = parseFloat(lastUpdateCreditHistory.principal);
        if (paymentAmount <= parseFloat(lastUpdateCreditHistory.interest)) {
            principal = principal + (parseFloat(lastUpdateCreditHistory.interest) - paymentAmount)
        } else {
            principal = principal - (paymentAmount - parseFloat(lastUpdateCreditHistory.interest));
        };
        if (paymentDetail.creditHistory.credit.paymentFrequency == 'Un pago') deletePaymentDetail = true;
        var interest = principal * paymentDetail.creditHistory.credit.interestRate / 100;
        const newFirstPayment = new Date(firstPayment);
        console.log("nueva fecha de primer pago: ", newFirstPayment);
        //this.getNextPaymenteDate(paymentDetail.creditHistory.credit.paymentFrequency, 2, paymentDetail.paymentDueDate);
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
        var newPaymentDetail = new PaymentDetailSaleCredit();
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
            await this.saleCreditHistoryRepository.save(lastUpdateCreditHistory);
            this.newPaymentDetail(newPaymentDetail);
            this.addPaymentDetail(payments, creditHistorySaved, paymentDetail.creditHistory.credit);
            response.success = true;

        }
        if (deletePaymentDetail) await this.paymentDetailSaleCreditRepository.delete(paymentDetail.id);
        return response;
    }

    private async newPaymentDetail(newPaymentDetail: PaymentDetailSaleCredit) {
        const paymentDetail = this.paymentDetailSaleCreditRepository.create(newPaymentDetail);
        return await this.paymentDetailSaleCreditRepository.save(paymentDetail);
    }

}
