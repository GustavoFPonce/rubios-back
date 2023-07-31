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
    payDay: string;
    information: string;



    constructor(credit: Credit) {
        const creditDto: CreditListDto = {
            id: credit.id,
            client: credit.client.lastName + " " + credit.client.name,
            debtCollector: credit.debtCollector.lastName + " " + credit.debtCollector.name,
            date: credit.date.toISOString().split('T')[0],
            principal: credit.principal,
            paymentFrequency: credit.paymentFrequency,
            numberPayment: credit.numberPayment,
            payment: credit.payment,
            payDay: credit.payDay,
            information: credit.information
        };

        return creditDto;

    }
}