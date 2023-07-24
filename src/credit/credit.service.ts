import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { format, parseISO, formatISO } from 'date-fns';
import { es } from 'date-fns/locale'
import { Credit } from './entities/credit.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreditCreateDto } from './dto/credit-create-dto';
import { StatusCredit } from './enum';
import { Status } from '../order/enums/status.enum';

@Injectable()
export class CreditService {
    constructor(
        @InjectRepository(Credit)
        private readonly creditRepository: Repository<Credit>) { }


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
        console.log("credit guardado: ", credit);
        const response =  this.creditRepository.save(credit);
        console.log("response: ", response);
        return response;
        
       //return null;
    }


    async byStatus(status: StatusCredit){
        console.log("status: ", status);
        return this.creditRepository.find({status})
    }

    async byDebtCollector(id: number){
        return this.creditRepository.find({debtCollectorId: id});
    }
}
