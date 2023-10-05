import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { SaleCredit } from "./sale-credit.entity";
import { SaleCreditHistory } from "./sale-credit-history.entity";
import { Cash } from "src/cash/entities/cash.entity";

@Entity({name:'payment_detail_sale_credit'})
export class PaymentDetailSaleCredit{
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

    @ManyToOne(()=> SaleCreditHistory, (creditHistory: SaleCreditHistory) => creditHistory.paymentsDetail)
    @JoinColumn({ name: 'sale_credit_history_id' }) 
    creditHistory: SaleCreditHistory;
}
