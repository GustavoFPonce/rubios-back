import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cash } from './entities/cash.entity';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class CashService {
    constructor(@InjectRepository(Cash) private cashRepository: Repository<Cash>) { }

    async getLastCash() {
        return this.cashRepository.findOne({ order: { id: 'DESC' } });
    }

    async openCash() {
        const cash = new Cash();
        cash.openingDate = new Date();
        cash.closingDate = null;
        cash.totalRevenuePeso = 0.00;
        cash.totalRevenueDollar = 0.00;
        cash.totalExpensePeso = 0.00;
        cash.totalExpenseDollar = 0.00;
        cash.openingBalancePeso = 0.00;
        cash.openingBalanceDollar = 0.00;
        cash.closingBalancePeso = 0.00;
        cash.closingBalanceDollar = 0.00;

        const lastCash = await this.getLastCash();
        if (lastCash) {
            cash.openingBalancePeso = lastCash.closingBalancePeso;
            cash.openingBalanceDollar = lastCash.closingBalanceDollar;
            cash.closingBalancePeso = 0.00;
            cash.closingBalanceDollar = 0.00;
        };
        const newCash = this.cashRepository.create(cash);
        const responseSaved = await this.cashRepository.save(newCash);
        console.log("responseSaved", responseSaved);
    }
}
