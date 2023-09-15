import { Column, Double, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { SaleCredit } from "./sale-credit.entity";
import { PaymentDetailSaleCredit } from "./payment-detail-sale-credit.entity";

@Entity({name:'sale_credit_history'})
export class SaleCreditHistory {
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
  
    @ManyToOne(()=> SaleCredit, (credit: SaleCredit) => credit.creditHistory)
    @JoinColumn({ name: 'sale_credit_id' }) 
    credit: SaleCredit;

  
    @OneToMany(() => PaymentDetailSaleCredit, (detail: PaymentDetailSaleCredit) => detail.creditHistory)
    paymentsDetail: PaymentDetailSaleCredit[]
}