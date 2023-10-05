import { CreditTransaction } from "src/cash/entities/credit-transaction.entity";
import { Credit } from "src/credit/entities/credit.entity";
import { Column, Entity, JoinColumn, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Client{

    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    clientNumber: string;

    @Column()
    lastName: string;

    @Column()
    name: string;

    @Column()
    address: string;

    @Column()
    phoneNumber: string;

    @Column()
    type: number;

    @OneToMany(()=> Credit, (credit)=> credit.client)
    credits: Credit[];

    @OneToMany(()=> CreditTransaction, (transaction)=> transaction.client)
    transactions: CreditTransaction[];
    
}