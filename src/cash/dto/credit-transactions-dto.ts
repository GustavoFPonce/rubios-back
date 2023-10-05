import { SaleCredit } from 'src/sale-credit/entities/sale-credit.entity';
import { CreditTransaction } from '../entities/credit-transaction.entity';
import { Credit } from 'src/credit/entities/credit.entity';
import { format } from 'date-fns';
export class CreditTransactionDto{
    id: number;
    date: string;
    concept: string;
    currencyType: string;
    creditId: number;
    amount: number;

    constructor(transaction: CreditTransaction, credit: Credit | SaleCredit){
        this.id = transaction.id;
        this.date = format(transaction.date, 'dd-MM-yyyy HH:mm:ss')
        this.concept = transaction.concept;
        this.currencyType = transaction.currencyType;
        this.amount = transaction.amount;
        this.creditId = credit.id

    }
}