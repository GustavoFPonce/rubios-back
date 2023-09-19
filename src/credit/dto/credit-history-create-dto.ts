import { Credit } from "../entities/credit.entity";
import { StatusCreditHistory } from "../enum";

export interface CreditHistoryCreateDto{
    date: Date;
    principal: number;
    interest: number;
    credit: Credit;
    firstPayment: Date,
    payDay: string;
    payment: number;
    status: StatusCreditHistory;
    accounted: boolean;
    commissionPaymentDetail: Date;
    balance: number
}