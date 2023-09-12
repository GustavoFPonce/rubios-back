import { Product } from "src/product/enities/product.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Sale } from "./sale.entity";

@Entity()
export class SaleDetail {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(()=> Product, (product)=> product.saleDetails)
    product: Product;

    @Column()
    quantity: number;

    @Column()
    price: number;

    @ManyToOne(()=> Sale, (sale: Sale)=> sale.saleDetails)
    sale: Sale
}