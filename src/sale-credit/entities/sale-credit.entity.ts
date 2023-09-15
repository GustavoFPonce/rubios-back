import { Column, Double, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { User } from "src/user/entities/user.entity";
import { Client } from "src/client/entities/client.entity";
import { PaymentDetailSaleCredit } from "./payment-detail-sale-credit.entity";
import { Sale } from "src/sale/entities/sale.entity";
import { SaleCreditHistory } from "./sale-credit-history.entity";

@Entity()
export class SaleCredit {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @OneToOne(() => Sale, (sale) => sale.saleCredit)
    @JoinColumn({ name: 'sale_id' })
    sale: Sale;

    @ManyToOne(() => User, (user) => user.credits)
    @JoinColumn({ name: 'debtCollector_id' })
    debtCollector: User;

    @ManyToOne(() => Client, (client) => client.credits)
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @Column()
    interestRate: number;

    @Column()
    paymentFrequency: string;

    @Column()
    numberPayment: number;

    @Column()
    status: number;

    @Column()
    commission: number;

    @Column()
    typeCurrency: string;

    
    @Column()
    information: string

    @OneToMany(() => SaleCreditHistory, (creditHistory: SaleCreditHistory) => creditHistory.credit)
    creditHistory: SaleCreditHistory[]
}