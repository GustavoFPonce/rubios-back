import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "./product.entity";

@Entity()
export class Inventory{

    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    date: Date;

    @Column()
    amount: number;

    @Column()
    costPesos: number;

    @Column()
    costDollar: number;

    @ManyToOne(()=> Product, (Product: Product)=> Product.inventories)
    @JoinColumn({name: 'product_id'})
    product: Product

}