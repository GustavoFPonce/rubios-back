import { Column, Double, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { PaymentDetail } from "./payment-detail.entity";
import { User } from "src/user/entities/user.entity";
import { Client } from "src/client/entities/client.entity";
import { CreditHistory } from "./credit-history.entity";
import { CreditTransaction } from "src/cash/entities/credit-transaction.entity";

@Entity()
export class Credit {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

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
    information: string

    @Column()
    typeCurrency: string

    @Column()
    commission: number;

    @OneToMany(() => CreditHistory, (creditHistory: CreditHistory) => creditHistory.credit)
    creditHistory: CreditHistory[]

    @OneToMany(() => CreditTransaction, (transaction: CreditTransaction) => transaction.credit)
    transactions: CreditTransaction[]
}