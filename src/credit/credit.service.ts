import { Injectable } from '@nestjs/common';
import { Between, Brackets, Repository } from 'typeorm';
import { format, parseISO, formatISO, addWeeks, addMonths, addDays } from 'date-fns';
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
        var dateCurrent = new Date();
        console.log("nuevo credito: ", creditCreateDto);
        const debtCollector = await this.userRepository.findOne(creditCreateDto.debtCollectorId);
        const client = await this.clientRepository.findOne(creditCreateDto.clientId);
        var createCredit = new Credit();
        createCredit.userId = userId;
        createCredit.client = client;
        createCredit.debtCollector = debtCollector;
        createCredit.date = dateCurrent;
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
        console.log("credit creado: ", createCredit);
        const credit = await this.creditRepository.create(createCredit);
        const creditSaved = await this.creditRepository.save(credit);
        console.log("credit guardado: ", credit);
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
            detail.paymentDueDate = (i == 0) ? credit.firstPayment : this.getNextPaymenteDate(credit.paymentFrequency, i + 1, credit.firstPayment);
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
                return addWeeks(firstPayment, 7 * periodNumber);

            case 'Mensual':
                return addMonths(firstPayment, 1 * periodNumber);
            default:
                throw new Error('Frecuencia de pago no válida.');
        }
    }



    async update(id: number, credit: CreditSavedDto) {
        var response = { success: false };
        const debtCollector = await this.userRepository.findOne(credit.debtCollectorId);
        var creditSaved = await this.creditRepository.findOne(credit.id);
        // console.log("credito en bbdd1: ", creditSaved);
        creditSaved.debtCollector = debtCollector;
        creditSaved.information = credit.information;
        creditSaved.typeCurrency = credit.typeCurrency;
        // creditSaved.firstPayment = parseISO(credit.firstPayment);
        // for (const [clave, valor] of Object.entries(credit)) {
        //     // if (valor !== 'firstPayment' && valor !== 'paymentFrecuency') {
        //     creditSaved[clave] = valor;
        //     //}
        //     //    if (valor == 'paymentFrecuency') {
        //     //         if (credit.paymentFrequency !== creditSaved.paymentFrequency) {
        //     //         }
        //     //     }
        // }
        // console.log("credito en bbdd2: ", creditSaved);
        // console.log('credit update: ', credit);
        const saved = await this.creditRepository.save(creditSaved);
        // console.log("credito en bbdd: ", saved);
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
                        id: 'DESC',
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

    async searchCredits(status: string,
        user: string,
        currency: string,
        start: Date,
        end: Date) {
        const conditions: any = [
            { date: Between(start, end) }
        ];
        var credits: any;
        if (currency != 'all') conditions.push({ typeCurrency: currency });
        if (status != 'all') conditions.push({ status: StatusCredit[`${status}`] });
        if (currency != 'all') conditions.push({ typeCurrency: currency });
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
                    if(term !='de'){
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
        const date = new Date();
        //return this.getDayString(date);
        return {
            day: this.getDayString(date),
            date: format(date, 'dd-MM-yyyy')
        }
    }

    async getCollectionsByDay(userId: number) {
        console.log("userId: ", userId);
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const date = new Date();

        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        console.log("user encontrado: ", user);
        if (user.role.name == "admin") {
            return await this.getCollectionsByDayAdmin(startDate, endDate, date);
        } else {
            return await this.getCollectionsByDayDebtCollector(userId, startDate, endDate, date);
        }

    }

    async getCollectionsByDayAdmin(startDate: Date, endDate: Date, date: Date) {
        console.log("starDate: ", startDate);
        console.log("endDate: ", endDate);
        console.log("date: ", date);
        var collections = await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where(new Brackets((qb) => {
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
            }))
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .getMany();

        console.log("cobranzas obtenidas: ", collections);

        const collectionsDto = collections.map(collection => {
            return new CollectionDto(collection);
        })
        return collectionsDto
    }

    async getCollectionsByDayDebtCollector(userId: number, startDate: Date, endDate: Date, date: Date) {
        console.log("date: ", date);
        var collections = await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where(new Brackets((qb) => {
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
            }))
            .andWhere('credit.debtCollector_Id = :userId', { userId })
            .orderBy('paymentsDetail.paymentDueDate', 'ASC')
            .getMany();

        console.log("cobranzas obtenidas: ", collections);

        const collectionsDto = collections.map(collection => {
            return new CollectionDto(collection);
        })
        return collectionsDto;
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
        if (nextPayment) nextPayment.balance = balance;
        const saved = await this.paymentDetailRepository.save(nextPayment);
    }


    async searchCollections(
        userId: string,
        status: string,
        currency: string,
        user: string,
        start: Date,
        end: Date
    ) {
        var collections: any;
        const userLogged = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
        console.log("user encontrado: ", user);
        if (userLogged.role.name == "admin") {
            if (user == 'all') {
                collections = await this.searchCollectionsByConditions(status, currency, start, end);
            } else {
                collections = await this.searchCollectionsByUserByConditions(status, currency, parseInt(user), start, end);

            };
        } else {
            console.log("entrando por aqui 1");
            collections = await this.searchCollectionsByUserByConditions(status, currency, parseInt(userLogged.id), start, end);

        }
        console.log("collections: ", collections);
        const collectionsDto = collections.map(collection => {
            return new CollectionDto(collection);
        })
        return collectionsDto
    }

    async searchCollectionsByConditions(status: string, currency: string, startDate: Date, endDate: Date) {
        return await this.creditRepository
            .createQueryBuilder('credit')
            .leftJoinAndSelect('credit.paymentsDetail', 'paymentsDetail')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where(new Brackets((qb) => {
                qb.orWhere('paymentsDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate,
                })
                    .orWhere(
                        '(paymentsDetail.paymentDueDate <= :startDate AND paymentsDetail.paymentDate IS NULL)',
                        { startDate }
                    )

                if (status != 'all' && status == 'canceled') qb.andWhere('paymentsDetail.paymentDate IS NOT NULL');
                if (status != 'all' && status == 'active') qb.andWhere('paymentsDetail.paymentDate IS NULL');
                if (currency != 'all') qb.andWhere('credit.typeCurrency = :currency', { currency });
            }))
            .orderBy('paymentsDetail.paymentDate', 'ASC')
            .getMany();
    }

    async searchCollectionsByUserByConditions(status: string, currency: string, user: number, startDate: Date, endDate: Date) {
        console.log("entrando por aqui 2");
        console.log("status: ", status);
        console.log("currency: ", currency);
        return await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where('credit.debtCollector_Id = :user', { user })
            .andWhere(new Brackets((qb) => {
                qb.andWhere(
                    '(paymentsDetail.paymentDueDate <= :endDate)',
                    { endDate }
                )
                if (status != 'all' && status == 'canceled') qb.andWhere('paymentsDetail.paymentDate IS NOT NULL');
                if (status != 'all' && status == 'active') qb.andWhere('paymentsDetail.paymentDate IS NULL');
                if (currency != 'all') qb.andWhere('credit.typeCurrency = :currency', { currency });
            }))
            .orderBy('paymentsDetail.paymentDate', 'ASC')
            .getMany();
    }

    // async getCollectionsByStatusByUser(status: string, user: number, startDate: Date, endDate: Date) {
    //     const statusCondition = (status == "active") ? 'paymentsDetail.paymentDate IS NULL' : 'paymentsDetail.paymentDate IS NOT NULL'
    //     var collections = await this.paymentDetailRepository
    //         .createQueryBuilder('paymentsDetail')
    //         .leftJoinAndSelect('paymentsDetail.credit', 'credit')
    //         .leftJoinAndSelect('credit.client', 'client')
    //         .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
    //         .where(new Brackets((qb) => {
    //             qb.orWhere('paymentsDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
    //                 startDate,
    //                 endDate,
    //             })
    //                 .orWhere(
    //                     '(paymentsDetail.paymentDueDate <= :startDate AND paymentsDetail.paymentDate IS NULL)',
    //                     { startDate }
    //                 )
    //         }))
    //         .andWhere(`(${statusCondition})`)
    //         .andWhere('credit.debtCollector_Id = :user', { user })
    //         .orderBy('paymentsDetail.paymentDate', 'ASC')
    //         .getMany();

    //     console.log("cobranzas obtenidas: ", collections);
    //     const collectionsDto = collections.map(collection => {
    //         return new CollectionDto(collection);
    //     })
    //     return collectionsDto
    // }

    // async getCollectionsByStatus(status: string, startDate: Date, endDate: Date) {
    //     const statusCondition = (status == "active") ? 'paymentsDetail.paymentDate IS NULL' : 'paymentsDetail.paymentDate IS NOT NULL'
    //     var collections = await this.paymentDetailRepository
    //         .createQueryBuilder('paymentsDetail')
    //         .leftJoinAndSelect('paymentsDetail.credit', 'credit')
    //         .leftJoinAndSelect('credit.client', 'client')
    //         .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
    //         .where(`(${statusCondition})`)
    //         .andWhere(new Brackets((qb) => {
    //             qb.orWhere('paymentsDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
    //                 startDate,
    //                 endDate,
    //             })
    //                 .orWhere(
    //                     '(paymentsDetail.paymentDueDate <= :startDate AND paymentsDetail.paymentDate IS NULL)',
    //                     { startDate }
    //                 )
    //         }))
    //         .orderBy('paymentsDetail.paymentDate', 'ASC')
    //         .getMany();

    //     console.log("cobranzas obtenidas: ", collections);
    //     const collectionsDto = collections.map(collection => {
    //         return new CollectionDto(collection);
    //     })
    //     return collectionsDto
    // }


}
