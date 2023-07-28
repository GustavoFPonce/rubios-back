import { Credit } from "../entities/credit.entity";

export class CreditListDto {
    id: number;
    client: string;
    debtCollector: string;
    date: string;
    principal: number;
    paymentFrequency: string;
    numberPayment: number;
    payment: number;



    constructor(credit: Credit) {
        const creditDto: CreditListDto = {
            id: credit.id,
            client: credit.clientId.toString(),
            debtCollector: credit.debtCollector.lastName + " " + credit.debtCollector.name,
            date: credit.date.toISOString().split('T')[0],
            principal: credit.principal,
            paymentFrequency: credit.paymentFrequency,
            numberPayment: credit.numberPayment,
            payment: credit.payment,
        };

        return creditDto;

    }
}