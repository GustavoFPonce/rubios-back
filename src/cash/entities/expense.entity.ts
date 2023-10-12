import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Cash } from "./cash.entity";
import { Client } from "src/client/entities/client.entity";
import { ExpenseType } from "../dto/expense-create-dto";
import { User } from "src/user/entities/user.entity";

@Entity()
export class Expense {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    date: Date;

    @ManyToOne(() => User, (user) => user.expenses)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    concept: string;

    @Column()
    type: ExpenseType;

    @Column()
    currencyType: string;

    @Column()
    amount: number;

    @ManyToOne(() => Cash, (cash: Cash) => cash.revenues)
    @JoinColumn({ name: 'cash_id' }) 
    cash: Cash
}