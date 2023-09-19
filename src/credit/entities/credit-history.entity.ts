import { Column, Double, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Credit } from "./credit.entity";
import { PaymentDetail } from "./payment-detail.entity";

@Entity({name:'credit_history'})
export class CreditHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    date: Date

    @Column()
    principal: number;

    @Column()
    interest: number;

    @Column()
    firstPayment: Date;

    @Column()
    payDay: string;

    @Column()
    payment: number;

    @Column()
    accounted: boolean

    @Column()
    commissionPaymentDate: Date

    @Column()
    status: number;

    @Column()
    balance: number;
  
    @ManyToOne(()=> Credit, (credit: Credit) => credit.creditHistory)
    @JoinColumn({ name: 'credit_id' }) 
    credit: Credit;

    @OneToMany(() => PaymentDetail, (detail: PaymentDetail) => detail.creditHistory)
    paymentsDetail: PaymentDetail[]
}