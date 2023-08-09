import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { OrdersProducts } from 'src/order/entities/orders-products.entity';
import { Category } from 'src/category/entities/category.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column()
  description: string;
  
  @Column()
  costPesos: number;

  @Column()
  costDollar: number;

  @Column()
  stock: number;

  @ManyToOne(
    () => Category, (category: Category) => category.products)
    @JoinColumn({ name: 'category_id' })
  category: Category;
}
