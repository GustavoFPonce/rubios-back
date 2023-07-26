import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { format, parseISO, formatISO, addWeeks, addMonths } from 'date-fns';
import { es } from 'date-fns/locale'
import { Credit } from './entities/credit.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreditCreateDto } from './dto/credit-create-dto';
import { StatusCredit } from './enum';
import { Status } from '../order/enums/status.enum';
import { PaymentDetail } from './entities/payment-detail.entity';
import { CreditSavedDto } from './dto/credit-saved-dto';

@Injectable()
export class CreditService {
    constructor(
        @InjectRepository(Credit)
        private readonly creditRepository: Repository<Credit>,
        @InjectRepository(PaymentDetail)
        private paymentDetailRepository: Repository<PaymentDetail>,
    ) { }


    async create(creditCreateDto: CreditCreateDto, userId: number) {

        const dateFirstPayment = parseISO(creditCreateDto.firstPayment);

        console.log("nuevo credito: ", creditCreateDto);
        var createCredit = new Credit();
        createCredit.userId = userId;
        createCredit.clientId = creditCreateDto.clientId;
        createCredit.debtCollectorId = creditCreateDto.debtCollectorId;
        createCredit.date = new Date();
        createCredit.firstPayment = parseISO(creditCreateDto.firstPayment);
        createCredit.paymentFrequency = creditCreateDto.paymentFrequency;
        createCredit.payDay = format(dateFirstPayment, 'EEEE', { locale: es });
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
        return creditSaved;

        //return null;
    }


    private async addPaymentDetail(credit: Credit) {
        for (let i = 0; i < credit.numberPayment; i++) {
            var detail = new PaymentDetail();
            detail.payment = credit.payment;
            detail.paymentDueDate = credit.firstPayment;
            detail.paymentDate = this.getNextPaymenteDate(credit.paymentFrequency, i + 1, credit.firstPayment);
            detail.credit = credit;
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
        var creditSaved = await this.creditRepository.findOne(credit.id);
        console.log("credito en bbdd1: ", creditSaved);
        creditSaved.firstPayment = parseISO(credit.firstPayment);
        for (const [clave, valor] of Object.entries(credit)) {
           // if (valor !== 'firstPayment' && valor !== 'paymentFrecuency') {
                creditSaved[clave] = valor;
            //}
        //    if (valor == 'paymentFrecuency') {
        //         if (credit.paymentFrequency !== creditSaved.paymentFrequency) {
        //         }
        //     }
        }
        console.log("credito en bbdd2: ", creditSaved);
        // console.log('credit update: ', credit);
        const saved = await this.creditRepository.save(creditSaved);
        console.log("credito en bbdd: ", saved);
        //return null;
    }


    async byStatus(status: StatusCredit) {
        console.log("status: ", status);
        return this.creditRepository.find({ status })
    }

    async byDebtCollector(id: number) {
        return this.creditRepository.find({ debtCollectorId: id });
    }


}
