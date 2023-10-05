import { Client } from "src/client/entities/client.entity";
import { TransactionType } from "./enum";
import { Cash } from "../entities/cash.entity";
import { SaleCredit } from "src/sale-credit/entities/sale-credit.entity";
import { Credit } from "src/credit/entities/credit.entity";
import { User } from "src/user/entities/user.entity";

export class CreditTransactionCreateDto {
    user: User;
    client: Client;
    concept: string;
    type: TransactionType;
    currencyType: string;
    amount: number;
    cash: Cash;
    credit: any;


    constructor(client: Client, credit: Credit | SaleCredit, cash: Cash, amount: number, concept: string, trasanctionType: number, user: User) {
        this.client = client;
        this.credit = credit;
        this.concept = concept;
        this.cash = cash;
        this.amount = amount;
        this.type = trasanctionType;
        this.currencyType = credit.typeCurrency;
        this.user = user;
    }
}