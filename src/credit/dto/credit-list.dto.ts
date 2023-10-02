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
    balance: number;



    constructor(credit: Credit) {
        //console.log("credit**: ", credit);
        const creditDto: CreditListDto = {
            id: credit.id,
            client: credit.client?.lastName + " " + credit.client?.name,
            clientId: credit.client?.id,
            clientNumber: credit.client?.clientNumber,
            debtCollector: credit.debtCollector.lastName + " " + credit.debtCollector.name,
            debtCollectorId: parseInt(credit.debtCollector.id),
            date: (credit.creditHistory.length>0) ?format(credit.creditHistory[credit.creditHistory.length - 1]?.date, "dd-MM-yyyy"):'',
            principal: (credit.creditHistory.length>0) ?credit.creditHistory[credit.creditHistory.length - 1]?.principal:0,
            balance: (credit.creditHistory.length>0) ?credit.creditHistory[credit.creditHistory.length - 1]?.balance:0,
            paymentFrequency: credit.paymentFrequency,
            numberPayment: credit.numberPayment,
            payment: (credit.creditHistory.length>0) ?credit.creditHistory[credit.creditHistory.length - 1]?.payment:0,
            payDay: (credit.creditHistory.length>0) ?credit.creditHistory[credit.creditHistory.length - 1]?.payDay:'',
            typeCurrency: credit.typeCurrency,
            firstPayment: (credit.creditHistory.length>0) ?format(credit.creditHistory[credit.creditHistory.length - 1]?.firstPayment, "dd-MM-yyyy"):'',
        };
        //console.log("credit list dto class: ", credit);
        return creditDto;

    }
}