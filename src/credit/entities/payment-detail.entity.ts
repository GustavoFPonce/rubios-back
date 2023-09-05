import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Credit } from "./credit.entity";
import { CreditHistory } from "./credit-history.entity";

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

    @ManyToOne(()=> CreditHistory, (creditHistory: CreditHistory) => creditHistory.paymentsDetail)
    @JoinColumn({ name: 'credit_history_id' }) 
    creditHistory: CreditHistory;
}
