import { Injectable } from '@nestjs/common';
import { Between, Brackets, Repository } from 'typeorm';
import { format, parseISO, formatISO, addWeeks, addMonths } from 'date-fns';
import { es } from 'date-fns/locale'
import { Credit } from './entities/credit.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreditCreateDto } from './dto/credit-create-dto';
import { StatusCredit } from './enum';
import { Status } from '../order/enums/status.enum';
import { PaymentDetail } from './entities/payment-detail.entity';
import { CreditSavedDto } from './dto/credit-saved-dto';
import { User } from 'src/user/entities/user.entity';
import { CreditListDto } from './dto/credit-list.dto';
import { Client } from 'src/client/entities/client.entity';
import { filter } from 'rxjs';
import { CollectionDto } from './dto/collection-dto';

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
        createCredit.date = new Date();
        createCredit.firstPayment = parseISO(creditCreateDto.firstPayment);
        createCredit.paymentFrequency = creditCreateDto.paymentFrequency;
        createCredit.payDay = this.getDayString(dateFirstPayment);
        createCredit.principal = creditCreateDto.principal;
        createCredit.interestRate = creditCreateDto.interestRate;
        createCredit.status = StatusCredit.active;
        createCredit.numberPayment = creditCreateDto.numberPayment;
        createCredit.payment = creditCreateDto.payment;
        createCredit.information = creditCreateDto.information;
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
            credits = await this.creditRepository.find({ where: { status: StatusCredit.active }, relations: ['debtCollector', 'client'] });
        } else {
            credits = await this.creditRepository.find({ where: { status: StatusCredit.active, debtCollector: user.id }, relations: ['debtCollector', 'client'] });
        }
        // console.log("creditos activos: ", credits);
        const creditsDto = this.getCreditsListDto(credits);

        // console.log("creditos activos: ", creditsDto);
        return creditsDto;
    }

    async byStatus(status: StatusCredit) {
        console.log("status: ", status);
        return this.creditRepository.find({ status })
    }

    async byDebtCollector(id: number) {
        const credits = await this.creditRepository.find({
            where: { debtCollector: { id: id } },
            relations: ['user'],
        });
        console.log("creditos por cobrador: ", credits);
        return credits;
    }


    async getByFilterStatusByDate(
        status: string,
        startDate: string,
        endDate: string
    ) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        var credits = [];
        if (status == 'all') {
            credits = await this.getAllByDateRange(start, end);
        } else {
            credits = await this.getByStatusByDateRange(status, start, end);
        }
        const creditsDto = this.getCreditsListDto(credits);

        return creditsDto;
    }

    private async getByStatusByDateRange(
        status: string,
        start: Date,
        end: Date
    ) {
        return await this.creditRepository.find({
            where: {
                status: StatusCredit[`${status}`],
                date: Between(start, end),
            },
            relations: ['debtCollector', 'client']
        });

    }


    private async getAllByDateRange(
        start: Date,
        end: Date
    ) {
        return await this.creditRepository.find({
            where: {
                date: Between(start, end),
            },
            relations: ['debtCollector', 'client']
        });
    }

    async getByClientName(name: string) {
        const filters = name.split(' ');
        console.log("filters: ", filters);
        const credits = await this.creditRepository.createQueryBuilder('credit')
            .leftJoinAndSelect('credit.client', 'client')
            .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
            .where(new Brackets((qb) => {
                filters.forEach((term, index) => {
                    qb.orWhere('client.name LIKE :term' + index, { ['term' + index]: `%${term}%` })
                        .orWhere('client.lastName LIKE :term' + index, { ['term' + index]: `%${term}%` });
                });
            }))
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

    async getPaymentsDetail(id: number): Promise<PaymentDetail[]> {
        const credit = await this.creditRepository.findOne({ where: { id: id }, relations: ['paymentsDetail'] });
        console.log("credit: ", credit);
        return credit.paymentsDetail;
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
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        var collections = await this.paymentDetailRepository
            .createQueryBuilder('paymentsDetail')
            .leftJoinAndSelect('paymentsDetail.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'client')
            .where('credit.debtCollector_Id = :userId', { userId })
            .andWhere('paymentsDetail.paymentDueDate BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
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


}
