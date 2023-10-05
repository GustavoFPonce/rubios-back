import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CreditTransaction } from "./credit-transaction.entity";

@Entity({name:'credit_transaction_detail'})
export class CreditTransactionDetail {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    paymentId: number;

    @Column()
    payment: number;

    @Column()
    actualPayment: number;

    @Column()
    paymentDueDate: Date;

    @Column()
    paymentDate: Date;

    @ManyToOne(()=> CreditTransaction, (creditTransaction: CreditTransaction)=> creditTransaction.creditTransactionsDetails)
    @JoinColumn({ name: 'credit_transaction_id' }) 
    creditTransaction: CreditTransaction

}