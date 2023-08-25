import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getDateStartEnd } from 'src/common/get-date-start-end';
import { Credit } from 'src/credit/entities/credit.entity';
import { PaymentDetail } from 'src/credit/entities/payment-detail.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ReportService {
    constructor(
        @InjectRepository(Credit) private creditRepository: Repository<Credit>,
        @InjectRepository(PaymentDetail) private paymentDetailRepository: Repository<PaymentDetail>
    ) { }

    async getCommissions() {
        // const currentDate = new Date();
        // const dates = getDateStartEnd(currentDate, currentDate)
        // const startDate = dates.startDate;
        // const endDate = dates.endDate
        // const commissions = await this.paymentDetailRepository.find(
        //     {
        //         where: {

        //         }
        //     })
    }
}
