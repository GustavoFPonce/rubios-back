import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Credit } from "./credit.entity";

@Entity({name:'payment_detail'})
export class PaymentDetail{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    payment: number;

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

    @ManyToOne(()=> Credit, (credit: Credit) => credit.paymentsDetail)
    @JoinColumn({ name: 'credit_id' }) 
    credit: Credit;
}
