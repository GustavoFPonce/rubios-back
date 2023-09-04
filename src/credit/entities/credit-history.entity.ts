import { Column, Double, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Credit } from "./credit.entity";

@Entity({name:'credit_history'})
export class CreditHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    date: Date

    @Column()
    principal: number;

    @Column()
    interest: number;
  
    @ManyToOne(()=> Credit, (credit: Credit) => credit.creditHistory)
    @JoinColumn({ name: 'credit_id' }) 
    credit: Credit;
}