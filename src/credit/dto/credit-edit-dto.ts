import { format } from "date-fns";
import { Credit } from "../entities/credit.entity";
import { StatusCredit } from "../enum";
import { PaymentDetailDto } from "./payment-detail-dto";
import { SaleCredit } from "src/sale-credit/entities/sale-credit.entity";

export class CreditEditDto {
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
    information: string;
    interestRate: number;
    firstPayment: string;
    typeCurrency: string;
    status: string;
    commission: number;
    paymentsDetail: PaymentDetailDto[];
    downPayment: number;



    constructor(credit: Credit | SaleCredit, paymentsDetail: PaymentDetailDto[]) {
        //console.log("credit**: ", credit);
        const creditDto: CreditEditDto = {
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
            information: credit.information,
            interestRate: credit.interestRate,
            firstPayment: format(credit.creditHistory[credit.creditHistory.length - 1].firstPayment, "dd-MM-yyyy"),
            typeCurrency: credit.typeCurrency,
            status: `${StatusCredit[credit.status]}`,
            commission: credit.commission,
            paymentsDetail: paymentsDetail,
            downPayment: (credit instanceof SaleCredit) ?credit.downPayment: null
        };
        //console.log("credit list dto class: ", credit);
        return creditDto;

    }
}