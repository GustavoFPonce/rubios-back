import { PaymentDetail } from "src/credit/entities/payment-detail.entity";
import { TransactionType } from "./enum";
import { Revenue } from "../entities/revenue.entity";
import { Expense } from "../entities/expense.entity";
import { PaymentDetailSaleCredit } from "src/sale-credit/entities/payment-detail-sale-credit.entity";
import { format } from "date-fns";

export class TransactionDto {
    id: number;
    date: string;
    user: string;
    concept: string;
    type: TransactionType;
    currencyType: string;
    amount: number;

    constructor(transaction: PaymentDetail | PaymentDetailSaleCredit | Revenue | Expense, type?: string) {
        if (transaction instanceof PaymentDetail || transaction instanceof PaymentDetailSaleCredit) {
            const credit = transaction.creditHistory.credit;
            this.id = transaction.id;
            this.date = format(transaction.paymentDate, 'dd-MM-yyyy HH:mm:ss'),
            this.user = credit.client.lastName + " " + credit.client.name;
            this.concept = 'pago de cuota';
            this.type = (transaction.paymentType == 1) ? TransactionType.payment : TransactionType.paymentInterest;
            this.currencyType = credit.typeCurrency;
            this.amount = transaction.actualPayment;
        } else if (transaction instanceof Revenue || transaction instanceof Expense) {
            this.id = transaction.id;
            this.date = format(transaction.date, 'dd-MM-yyyy HH:mm:ss'),
            this.user = transaction.user;
            this.concept = transaction.concept;
            this.type = (type == 'revenue') ? TransactionType.revenue : TransactionType.expense;
            this.currencyType = transaction.currencyType;
            this.amount = transaction.amount;
        }
    }

}
