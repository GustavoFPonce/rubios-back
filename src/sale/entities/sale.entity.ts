import { Client } from "src/client/entities/client.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { SaleDetail } from "./sale-detail.entity";
import { SaleStatus } from "../enum";
import { SaleCredit } from "src/sale-credit/entities/sale-credit.entity";
import { Cash } from "src/cash/entities/cash.entity";

@Entity()
export class Sale {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    date: Date;

    @ManyToOne(() => Client, (client) => client.credits)
    client: Client;

    @Column()
    userId: number;

    @Column()
    paymentType: string;

    @Column()
    total: number;

    @Column()
    payment: number;

    @Column()
    status: SaleStatus;

    @Column()
    currencyType: string;

    @OneToMany(() => SaleDetail, (detail: SaleDetail) => detail.sale)
    saleDetails: SaleDetail[]

    @OneToOne(() => SaleCredit, (saleCredit: SaleCredit) => saleCredit.sale)
    saleCredit: SaleCredit;

    @ManyToOne(()=> Cash, (cash: Cash) => cash.sales)
    @JoinColumn({ name: 'cash_id' }) 
    cash: Cash;
}