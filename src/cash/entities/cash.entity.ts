import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Revenue } from "./revenue.entity";
import { Expense } from "./expense.entity";
import { PaymentDetail } from "src/credit/entities/payment-detail.entity";
import { PaymentDetailSaleCredit } from "src/sale-credit/entities/payment-detail-sale-credit.entity";


@Entity()
export class Cash {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    openingDate: Date;

    @Column()
    closingDate: Date;

    @Column()
    openingBalancePeso: number;    

    @Column()
    closingBalancePeso: number;

    @Column()
    openingBalanceDollar: number;    

    @Column()
    closingBalanceDollar: number;

    @Column()
    totalRevenuePeso: number;

    @Column()
    totalExpensePeso: number;

    @Column()
    totalRevenueDollar: number;

    @Column()
    totalExpenseDollar: number;

    @OneToMany(() => Revenue, (revenue: Revenue) => revenue.cash)
    revenues: Revenue[];

    @OneToMany(() => Expense, (expense: Expense) => expense.cash)
    expenses: Expense[];

    @OneToMany(() => PaymentDetail, (detail: PaymentDetail) => detail.cash)
    paymentDetailPersonalCredit: PaymentDetail[]

    @OneToMany(() => PaymentDetailSaleCredit, (detail: PaymentDetailSaleCredit) => detail.cash)
    paymentDetailSaleCredit: PaymentDetailSaleCredit[]
}