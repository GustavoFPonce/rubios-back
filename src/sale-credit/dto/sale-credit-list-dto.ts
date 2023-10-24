import { format } from "date-fns";
import { SaleCredit } from "../entities/sale-credit.entity";

export class SaleCreditListDto {
    id: number;
    client: string;
    clientId: number;
    clientNumber: string;
    debtCollector: string;
    debtCollectorId: number;
    date: string;
    principal: number;
    paymentFrequency: string;
    numberPayment: number;
    payment: number;
    payDay: string;
    firstPayment: string;
    typeCurrency: string;
    balance: number;
    downPayment: number;
    creditHistoryId: number


    constructor(credit: SaleCredit) {
        //console.log("credit**: ", credit);
        const creditDto: SaleCreditListDto = {
            id: credit.id,
            client: credit.client?.lastName + " " + credit.client?.name,
            clientId: credit.client?.id,
            clientNumber: credit.client?.clientNumber,
            debtCollector: credit.debtCollector.lastName + " " + credit.debtCollector.name,
            debtCollectorId: parseInt(credit.debtCollector.id),
            date: format(credit.creditHistory[credit.creditHistory.length-1].date, "dd-MM-yyyy"),
            principal: credit.creditHistory[credit.creditHistory.length-1].principal,
            balance: (credit.creditHistory.length>0) ?credit.creditHistory[credit.creditHistory.length - 1]?.balance:0,
            paymentFrequency: credit.paymentFrequency,
            numberPayment: credit.numberPayment,
            payment: credit.creditHistory[credit.creditHistory.length-1].payment,
            payDay: credit.creditHistory[credit.creditHistory.length-1].payDay,
            firstPayment: format(credit.creditHistory[credit.creditHistory.length-1].firstPayment, "dd-MM-yyyy"),
            typeCurrency: credit.typeCurrency,
            downPayment: credit.downPayment,
            creditHistoryId: credit.creditHistory[credit.creditHistory.length-1].id
        };
        //console.log("credit list dto class: ", credit);
        return creditDto;

    }
}