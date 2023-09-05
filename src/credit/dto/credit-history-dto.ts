import { format } from "date-fns";
import { CreditHistory } from "../entities/credit-history.entity";

export class CreditHistoryDto{
    id: number;
    date: string;
    firstPayment: string;
    payDay: string;
    principal: number;
    interest: number;

    constructor(creditHistory: CreditHistory){
        const creditHistoryDto: CreditHistoryDto = {
            id: creditHistory.id,
            date: format(creditHistory.date, "dd-MM-yyyy"),
            firstPayment: format(creditHistory.firstPayment, "dd-MM-yyyy"),
            payDay: creditHistory.payDay,
            principal: creditHistory.principal,
            interest: creditHistory.interest
        };
        return creditHistoryDto;
    }
}