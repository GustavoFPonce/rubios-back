import { Column, Double, Entity, JoinColumn, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { PaymentDetail } from "./payment-detail.entity";

@Entity()
export class Credit{
@PrimaryGeneratedColumn()
id: number;

@Column()
userId: number;

@Column()
clientId: number;

@Column()
debtCollectorId: number;

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

@OneToMany(()=>PaymentDetail, (detail: PaymentDetail) => detail.credit)
paymentDetails: PaymentDetail[]
}