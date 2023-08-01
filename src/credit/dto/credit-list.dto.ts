import { Credit } from "../entities/credit.entity";

export class CreditListDto {
    id: number;
    client: string;
    debtCollector: string;
    debtCollectorId: number;
    date: string;
    principal: number;
    paymentFrequency: string;
    numberPayment: number;
    payment: number;
    payDay: string;
    information: string;
    interestRate: number;
    firstPayment: string;



    constructor(credit: Credit) {
        const creditDto: CreditListDto = {
            id: credit.id,
            client: credit.client.lastName + " " + credit.client.name,
            debtCollector: credit.debtCollector.lastName + " " + credit.debtCollector.name,
            debtCollectorId: parseInt(credit.debtCollector.id),
            date: credit.date.toISOString().split('T')[0],
            principal: credit.principal,
            paymentFrequency: credit.paymentFrequency,
            numberPayment: credit.numberPayment,
            payment: credit.payment,
            payDay: credit.payDay,
            information: credit.information,
            interestRate: credit.interestRate,
            firstPayment: credit.firstPayment.toISOString().split('T')[0]
        };
        // console.log("credit list dto: ", credit);
        return creditDto;

    }
}