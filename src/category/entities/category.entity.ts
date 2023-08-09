import { Product } from 'src/product/enities/product.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    name: string

    @OneToMany(()=> Product, (product: Product)=> product.category)
    products: Product[]
}