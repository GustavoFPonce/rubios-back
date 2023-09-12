import { Client } from "src/client/entities/client.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { SaleDetail } from "./sale-detail.entity";
import { SaleStatus } from "../enum";

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
    status: SaleStatus

    @OneToMany(() => SaleDetail, (detail: SaleDetail) => detail.sale)
    saleDetails: SaleDetail[]

}