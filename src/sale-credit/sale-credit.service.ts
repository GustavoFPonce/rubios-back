import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SaleCredit } from './entities/sale-credit.entity';
import { Repository } from 'typeorm';
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
}
