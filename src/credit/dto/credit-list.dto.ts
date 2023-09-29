import { format } from "date-fns";
import { Credit } from "../entities/credit.entity";
import { StatusCredit } from "../enum";
import { PaymentDetailDto } from "./payment-detail-dto";

export class CreditListDto {
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
    typeCurrency: string;
    firstPayment: string;



    constructor(credit: Credit) {
        //console.log("credit**: ", credit);
        const creditDto: CreditListDto = {
            id: credit.id,
            client: credit.client?.lastName + " " + credit.client?.name,
            clientId: credit.client?.id,
            clientNumber: credit.client?.clientNumber,
            debtCollector: credit.debtCollector.lastName + " " + credit.debtCollector.name,
            debtCollectorId: parseInt(credit.debtCollector.id),
            date: format(credit.creditHistory[credit.creditHistory.length - 1].date, "dd-MM-yyyy"),
            principal: credit.creditHistory[credit.creditHistory.length - 1].principal,
            paymentFrequency: credit.paymentFrequency,
            numberPayment: credit.numberPayment,
            payment: credit.creditHistory[credit.creditHistory.length - 1].payment,
            payDay: credit.creditHistory[credit.creditHistory.length - 1].payDay,
            typeCurrency: credit.typeCurrency,
            firstPayment: format(credit.creditHistory[credit.creditHistory.length - 1].firstPayment, "dd-MM-yyyy"),
        };
        //console.log("credit list dto class: ", credit);
        return creditDto;

    }
}