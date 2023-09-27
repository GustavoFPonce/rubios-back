import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Cash } from "./cash.entity";

@Entity()
export class Revenue {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    date: Date;

    @Column()
    user: string;

    @Column()
    concept: string;

    @Column()
    type: string;

    @Column()
    currencyType: string;

    @Column()
    amount: number;

    @ManyToOne(()=> Cash, (cash: Cash)=> cash.revenues)
    cash: Cash
}