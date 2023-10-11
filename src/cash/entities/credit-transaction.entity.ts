import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Cash } from "./cash.entity";
import { Client } from "src/client/entities/client.entity";
import { TransactionType } from "../dto/enum";
import { Credit } from "src/credit/entities/credit.entity";
import { SaleCredit } from "src/sale-credit/entities/sale-credit.entity";
import { User } from "src/user/entities/user.entity";
import { CreditTransactionDetail } from "./credit-transaction-detail.entity";

@Entity({name:'credit_transaction'})
export class CreditTransaction {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    date: Date;

    @ManyToOne(() => Client, (client) => client.transactions)
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @ManyToOne(() => User, (user) => user.transactions)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    concept: string;

    @Column()
    type: TransactionType;

    @Column()
    currencyType: string;

    @Column()
    amount: number;

    @Column()
    accounted: boolean;

    @ManyToOne(()=> Credit, (credit: Credit) => credit.transactions)
    @JoinColumn({ name: 'credit_id' }) 
    credit: Credit;

    @ManyToOne(()=> SaleCredit, (credit: SaleCredit) => credit.transactions)
    @JoinColumn({ name: 'sale_credit_id' }) 
    saleCredit: SaleCredit;

    @ManyToOne(() => Cash, (cash: Cash) => cash.revenues)
    @JoinColumn({ name: 'cash_id' }) 
    cash: Cash;

    @OneToMany(() => CreditTransactionDetail, (detail: CreditTransactionDetail) => detail.creditTransaction)
    creditTransactionsDetails: CreditTransactionDetail[]
}