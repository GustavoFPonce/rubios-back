import { ConsoleLogger, Injectable, NotFoundException } from '@nestjs/common';
import { Between, Brackets, Repository } from 'typeorm';
import { format, parseISO, formatISO, addWeeks, addMonths, addDays, subDays, parse } from 'date-fns';
import { es } from 'date-fns/locale'
import { Credit } from './entities/credit.entity';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { CreditCreateDto } from './dto/credit-create-dto';
import { StatusCredit } from './enum';
import { PaymentDetail } from './entities/payment-detail.entity';
import { CreditSavedDto } from './dto/credit-saved-dto';
import { User } from 'src/user/entities/user.entity';
import { CreditListDto } from './dto/credit-list.dto';
import { Client } from 'src/client/entities/client.entity';
import { filter } from 'rxjs';
import { CollectionDto } from './dto/collection-dto';
import { PaymentDetailDto } from './dto/payment-detail-dto';
import { getDateObject } from 'src/common/get-date-object';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

@Injectable()
export class CreditService {
    constructor(
        @InjectRepository(Credit)
        private readonly creditRepository: Repository<Credit>,
        @InjectRepository(PaymentDetail)
        private paymentDetailRepository: Repository<PaymentDetail>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Client)
        private clientRepository: Repository<Client>,
    ) { }


    async create(creditCreateDto: CreditCreateDto, userId: number) {
        var response = { success: false }
        const dateFirstPayment = parseISO(creditCreateDto.firstPayment);
        console.log("nuevo credito: ", creditCreateDto);
        const debtCollector = await this.userRepository.findOne(creditCreateDto.debtCollectorId);
        const client = await this.clientRepository.findOne(creditCreateDto.clientId);
        var createCredit = new Credit();
        createCredit.userId = userId;
        createCredit.client = client;
        createCredit.debtCollector = debtCollector;
        createCredit.date = parseISO(creditCreateDto.date);
        createCredit.firstPayment = parseISO(creditCreateDto.firstPayment);
        createCredit.paymentFrequency = creditCreateDto.paymentFrequency;
        createCredit.payDay = this.getDayString(dateFirstPayment);
        createCredit.principal = creditCreateDto.principal;
        createCredit.interestRate = creditCreateDto.interestRate;
        createCredit.status = StatusCredit.active;
        createCredit.numberPayment = creditCreateDto.numberPayment;
        createCredit.payment = creditCreateDto.payment;
        createCredit.information = creditCreateDto.information;
        createCredit.typeCurrency = creditCreateDto.typeCurrency;
        createCredit.commission = creditCreateDto.commission;
        console.log("credit creado: ", createCredit);
        const credit = await this.creditRepository.create(createCredit);
        const creditSaved = await this.creditRepository.save(credit);
        console.log("credit guardado: ", creditSaved);
        this.addPaymentDetail(creditSaved);
        console.log("response: ", creditSaved);
        if (creditSaved) response.success = true;
        return response;

        //  return null;
    }


    private async addPaymentDetail(credit: Credit) {
        for (let i = 0; i < credit.numberPayment; i++) {
            var detail = new PaymentDetail();
            detail.payment = credit.payment;
            detail.paymentDueDate = (i == 0) ? credit.firstPayment : this.getNextPaymenteDate(credit.paymentFrequency, i, credit.firstPayment);
            detail.paymentDate = null;
            detail.credit = credit;
            detail.balance = (i == 0) ? parseFloat((credit.payment * credit.numberPayment).toFixed(2)) : 0;
            console.log("detail: ", detail);
            const paymentDetail = await this.paymentDetailRepository.create(detail);
            await this.paymentDetailRepository.save(paymentDetail);
        };
    }

    private getNextPaymenteDate(frequency: string, periodNumber: number, firstPayment: Date): Date {
        switch (frequency) {
            case 'Semanal':
                return addDays(firstPayment, 7 * periodNumber);

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
        const user = await this.userRepository.findOne({ where: { id: id }, relations: ['role'] });
        // console.log("usuario encontrado: ", user);
        var credits = [];
        if (user.role.name == 'admin') {
            credits = await this.creditRepository.find(
                {
                    where: { status: StatusCredit.active }, relations: ['debtCollector', 'client'],
                    order: {
                        date: 'DESC',
                        id: 'DESC'
                    }
                });
        } else {
            credits = await this.creditRepository.find({
                where: { status: StatusCredit.active, debtCollector: user.id },
                relations: ['debtCollector', 'client'],
                order: {
                    id: 'DESC',
                }
            });
        }
        // console.log("creditos activos: ", credits);
        const creditsDto = this.getCreditsListDto(credits);

        // console.log("creditos activos: ", creditsDto);
        return creditsDto;
    }

    async byStatus(status: StatusCredit) {
        console.log("status: ", status);
        return this.creditRepository.find({
            where: { status }, order: {
                date: 'DESC',
            }, relations: ['paymentsDetail']
        })
    }

    async byDebtCollector(id: number) {
        const credits = await this.creditRepository.find({
            where: { debtCollector: { id: id } },
            relations: ['user'],
            order: {
                date: 'DESC',
            }
        });
        console.log("creditos por cobrador: ", credits);
        return credits;
    }

    async searchCredits(
        status: string,
        user: string,
        currency: string,
        frequency: string,
        start: Date,
        end: Date) {
        const conditions: any = [
            { date: Between(start, end) }
        ];
        var credits: any;
        if (currency != 'all') conditions.push({ typeCurrency: currency });
        if (status != 'all') conditions.push({ status: status });
        if (currency != 'all') conditions.push({ typeCurrency: currency });
        if (frequency != 'all') conditions.push({ paymentFrequency: frequency });
        if (user == 'all') {
            credits = await this.searchCreditsByConditions(conditions);
        } else {
            credits = await this.searchCreditsByConditionsByUser(conditions, parseInt(user));
            console.log("credits: ", credits);
        };
        const creditsDto = this.getCreditsListDto(credits);

        //console.log("creditos activos: ", creditsDto);
        return creditsDto;
    }


    async searchCreditsByConditionsByUser(conditions: [], user: number) {
        return await this.creditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.client', 'client')
            .where(new Brackets((qb) => {
                qb.andWhere('credit.debtCollector_Id = :user', { user });
                conditions.forEach((term: any, index) => {
                    qb.andWhere(term)
                });
            }))
            .orderBy('credit.date', 'DESC')
            .getMany();
    }

    async searchCreditsByConditions(conditions: []) {
        console.log("condiciones: ", conditions);
        return await this.creditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('credit.client', 'client')
            .where(new Brackets((qb) => {
                conditions.forEach((term: any, index) => {
                    qb.andWhere(term)
                });
            }))
            .orderBy('credit.date', 'DESC')
            .getMany();

    }


    async getByClientName(name: string) {
        const filters = name.split(' ');
        console.log("filters: ", filters);
        const credits = await this.creditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where(new Brackets((qb) => {
                filters.forEach((term, index) => {
                    if (term != 'de') {
                        qb.orWhere('client.name LIKE :term' + index, { ['term' + index]: `%${term}%` })
                            .orWhere('client.lastName LIKE :term' + index, { ['term' + index]: `%${term}%` });
                    }
                });
            }))
            .orderBy('credit.date', 'DESC')
            .getMany();
        //console.log("creditos: ", credits);
        const creditsDto = this.getCreditsListDto(credits);
        // console.log("creditos: ", creditsDto);
        return creditsDto;
    }

    private getCreditsListDto(credits: Credit[]): CreditListDto[] {
        return credits.map(credit => {
            const creditList = new CreditListDto(credit);
            return creditList;
        })
    }

    async getPaymentsDetail(id: number): Promise<PaymentDetailDto[]> {
        const credit = await this.creditRepository.findOne({ where: { id: id }, relations: ['paymentsDetail'] });
        console.log("credit: ", credit);
        const paymentsDetail = credit.paymentsDetail.map(x => {
            return new PaymentDetailDto(x);
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

    async getCollectionsByDate(userId: number, dateQuery: string) {

        const dateCurrentLocalObject = new Date();
        console.log("dateCurrentLocalObject: ", dateCurrentLocalObject);
        var argentinaTime = new Date();
        argentinaTime.setHours(argentinaTime.getHours() - 3);
        console.log("arg: ", argentinaTime);
        const dayType = (this.areDatesEqual(argentinaTime, dateCurrentLocalObject)) ? 'current' : 'not-current';
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
            .leftJoinAndSelect('paymentsDetail.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where(this.getConditionsFilterByDay(startDate, endDate, day))
            .orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate AND credit.status = :status', {
                startDate,
                endDate,
                status: StatusCredit.canceled
            })
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .getMany();

        console.log("cobranzas obtenidas: ", collections);

        const collectionsDto = collections.map(collection => {
            return new CollectionDto(collection);
        })
        return collectionsDto
    }

    async getCollectionsByDayDebtCollector(userId: number, startDate: Date, endDate: Date, day: string) {
        console.log("userId: ", userId);
        var collections = await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where(this.getConditionsFilterByDay(startDate, endDate, day))
            .andWhere('credit.debtCollector.id = :userId', { userId })
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .getMany();

        console.log("cobranzas obtenidas: ", collections);

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


    private getDayString(date: Date) {
        return format(date, 'EEEE', { locale: es });
    }

    async registerPayment(id: number) {
        var response = { success: false, collection: {} };
        var payment = await this.paymentDetailRepository.createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where('paymentsDetail.id = :id', { id })
            .getOne();

        // findOne({ where: { id: id }, relations: ['credit'] });
        payment.paymentDate = new Date();
        payment.balance = payment.balance - payment.payment;
        console.log("saldo: ", payment.balance);
        const saved = await this.paymentDetailRepository.save(payment);
        console.log("pago guardado: ", saved);
        if (saved) {
            response.success = true;
            response.collection = new CollectionDto(saved);
            this.uptadeBalanceNextPayment(payment.balance, payment.credit.id);
        }
        return response;
    }


    private async uptadeBalanceNextPayment(balance: number, creditId: number) {
        console.log("credit id: ", creditId);
        const date = null;
        var nextPayment = await this.paymentDetailRepository.createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.credit', 'credit')
            .where('credit.id = :creditId', { creditId })
            .andWhere('paymentsDetail.paymentDate IS NULL')
            .getOne();
        console.log("siguiente pago: ", nextPayment);
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

    async searchCollectionsByConditions(statusCredit: string, currency: string, startDate: Date, endDate: Date, statusPayment: string, areDateEqual: boolean) {
        return await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where(this.getConditionsFilterCollections(statusCredit, currency, startDate, endDate, statusPayment, areDateEqual))
            .orderBy('paymentsDetail.paymentDate', 'ASC')
            .getMany();
    }

    async searchCollectionsByUserByConditions(statusCredit: string, currency: string, user: number, startDate: Date, endDate: Date, statusPayment: string, areDateEqual: boolean) {
        return await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where('credit.debtCollector_Id = :user', { user })
            .andWhere(this.getConditionsFilterCollections(statusCredit, currency, startDate, endDate, statusPayment, areDateEqual))
            .orderBy('paymentsDetail.paymentDate', 'ASC')
            .getMany();
    }

    private getConditionsFilterCollections(statusCredit: string, currency: string, startDate: Date, endDate: Date, statusPayment: string, areDateEqual: boolean) {
        console.log("estado de pago: ", statusPayment);
        const commonConditions = qb2 => {
            if (currency != 'all') qb2.andWhere('credit.typeCurrency = :currency', { currency });
            if (statusPayment == 'canceled') qb2.andWhere('paymentsDetail.paymentDate IS NOT NULL');
            if (statusPayment == 'active') qb2.andWhere('paymentsDetail.paymentDate IS NULL');
            qb2.andWhere('credit.status = :statusCredit', { statusCredit })
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
                            commonConditions(qb2)
                            qb2.orWhere('paymentsDetail.paymentDate BETWEEN :startDate AND :endDate', {
                                startDate,
                                endDate,
                            })
                            commonConditions(qb2)
                            qb2.orWhere(
                                '(paymentsDetail.paymentDueDate >= :startDate AND paymentsDetail.paymentDueDate <= :endDate)',
                                { startDate, endDate }
                            );
                            commonConditions(qb2)
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
        const credit = await this.creditRepository.findOne({ where: { id: id }, relations: ['debtCollector', 'client'] });
        if (!credit) {
            throw new NotFoundException(`No se encontró el crédito con el id: ${id}`);
        };

        return new CreditListDto(credit);
    }

}
