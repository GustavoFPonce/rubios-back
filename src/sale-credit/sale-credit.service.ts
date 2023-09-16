import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SaleCredit } from './entities/sale-credit.entity';
import { Brackets, Repository } from 'typeorm';
import { SaleCreditCreateDto } from './dto/sale-credit-create-dto';
import { Sale } from 'src/sale/entities/sale.entity';
import { CreditHistoryCreateDto } from 'src/credit/dto/credit-history-create-dto';
import { PaymentType, StatusCredit, StatusCreditHistory, StatusPayment } from 'src/credit/enum';
import { addDays, addMonths, format, parseISO } from 'date-fns';
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
        var response = { success: false }
        const dateFirstPayment = parseISO(creditCreateDto.firstPayment);
        const debtCollector = await this.userRepository.findOne(creditCreateDto.debtCollectorId);
        const client = await this.clientRepository.findOne(creditCreateDto.clientId);
        const payments = [];
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
        const creditSaved = await this.saleCreditRepository.save(credit);
        //console.log("date: ", creditCreateDto.date);
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
            commissionPaymentDetail: null

        };
        // console.log("creditHistorySaved: ", newCreditHistory);
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

    async annulSaleCredit(saleId: number){
        var response = {success: false, error: ''};
        const saleCredit = await this.saleCreditRepository.findOne({where:{sale: saleId}});
        saleCredit.status = StatusCredit.annulled;
        const updateCredit = await this.saleCreditRepository.save(saleCredit);
        if(updateCredit) response.success = true;
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
        const credit = await this.saleCreditRepository.findOne({ where: { id: id }, relations: ['debtCollector', 'client', 'creditHistory'] });
        if (!credit) {
            throw new NotFoundException(`No se encontró el crédito con el id: ${id}`);
        };

        return new CreditListDto(credit);
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
        console.log("credit: ", credit);
        const paymentsDetail = credit.paymentsDetail.map(x => {
            return new PaymentDetailDto(x);
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

    }
}
