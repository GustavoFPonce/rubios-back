import { Column, Double, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { PaymentDetail } from "./payment-detail.entity";
import { User } from "src/user/entities/user.entity";

@Entity()
export class Credit {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;
    
    @ManyToOne(() => User, (user) => user.credits)
    @JoinColumn({ name: 'debtCollector_id' })
    debtCollector: User;

    @Column()
    clientId: number;

    @Column()
    date: Date

    @Column()
    firstPayment: Date;

    @Column()
    payDay: string;

    @Column()
    principal: number;

    @Column()
    interestRate: number;

    @Column()
    paymentFrequency: string;

    @Column()
    numberPayment: number;

    @Column()
    payment: number;

    @Column()
    status: number;

    @Column()
    information: string

    @OneToMany(() => PaymentDetail, (detail: PaymentDetail) => detail.credit)
    paymentDetails: PaymentDetail[]
}