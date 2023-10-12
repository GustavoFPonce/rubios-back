import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Cash } from "./cash.entity";
import { User } from "src/user/entities/user.entity";

@Entity()
export class Revenue {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    date: Date;

    @ManyToOne(() => User, (user) => user.revenues)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    concept: string;

    @Column()
    currencyType: string;

    @Column()
    amount: number;

    @ManyToOne(()=> Cash, (cash: Cash)=> cash.revenues)
    @JoinColumn({ name: 'cash_id' }) 
    cash: Cash
}