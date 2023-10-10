import { PaymentDetail } from "src/credit/entities/payment-detail.entity";
import { TransactionType } from "./enum";
import { Revenue } from "../entities/revenue.entity";
import { Expense } from "../entities/expense.entity";
import { PaymentDetailSaleCredit } from "src/sale-credit/entities/payment-detail-sale-credit.entity";
import { format } from "date-fns";
import { CreditTransaction } from "../entities/credit-transaction.entity";
import { SaleCredit } from "src/sale-credit/entities/sale-credit.entity";
import { Credit } from "src/credit/entities/credit.entity";
import { Sale } from "src/sale/entities/sale.entity";

export class TransactionDto {
    id: number;
    date: string;
    user: string;
    concept: string;
    type: number;
    currencyType: string;
    amount: number;

    constructor(transaction: CreditTransaction | Revenue | Expense | Sale, credit?:Credit | SaleCredit) {
         if (transaction instanceof CreditTransaction) {
            this.id = transaction.id;
            this.date = format(transaction.date, 'dd-MM-yyyy HH:mm:ss'),
            this.user = credit.client?.lastName + " " + credit.client?.name;
            this.concept = transaction.concept;
            this.type =  transaction.type,
            (transaction.type == 1) ? TransactionType.payment : TransactionType.paymentInterest;
            this.currencyType = transaction.currencyType;
            this.amount = transaction.amount;
        }
         else if (transaction instanceof Revenue || transaction instanceof Expense ) {
            this.id = transaction.id;
            this.date = format(transaction.date, 'dd-MM-yyyy HH:mm:ss'),
            this.user = transaction.user;
            this.concept = transaction.concept;
            this.type = transaction.type;
            this.currencyType = transaction.currencyType;
            this.amount = transaction.amount;
        }else{
            this.id = transaction.id;
            this.date = format(transaction.date, 'dd-MM-yyyy HH:mm:ss'),
            this.user = transaction.client?.lastName + " " + transaction.client?.name;;
            this.concept = 'Venta Contado';
            this.type = 5;
            this.currencyType = transaction.currencyType;
            this.amount = transaction.total;
        }
    }

}
