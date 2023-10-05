import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Credit } from "./credit.entity";
import { CreditHistory } from "./credit-history.entity";
import { Cash } from "src/cash/entities/cash.entity";

@Entity({name:'payment_detail'})
export class PaymentDetail{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    payment: number;

    @Column()
    actualPayment: number;

    @Column()
    paymentDueDate: Date;

    @Column()
    paymentDate: Date

    @Column()
    balance: number;

    @Column()
    accountabilityDate: Date

    @Column()
    recoveryDateCommission: Date

    @Column()
    paymentType: number;

    @Column()
    isNext: boolean;    

    @ManyToOne(()=> CreditHistory, (creditHistory: CreditHistory) => creditHistory.paymentsDetail)
    @JoinColumn({ name: 'credit_history_id' }) 
    creditHistory: CreditHistory;
}
