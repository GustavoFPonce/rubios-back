import { Column, Double, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Credit{
@PrimaryGeneratedColumn()
id: Number;

@Column()
userId: Number;

@Column()
clientId: Number;

@Column()
debtCollectorId: Number;

@Column()
date: Date

@Column()
firstPayment: Date;

@Column()
payDay: String;

@Column()
principal: Number;

@Column()
interestRate: Number;

@Column()
paymentFrequency: String;

@Column()
numberPayment: Number;

@Column()
payment: Number;

@Column()
status: Number;

@Column()
information: String
}