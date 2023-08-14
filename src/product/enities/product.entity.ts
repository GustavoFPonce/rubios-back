import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Category } from 'src/category/entities/category.entity';
import { Inventory } from './inventory';

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
  price: number;

  @ManyToOne(
    () => Category, (category: Category) => category.products)
    @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(()=> Inventory, (inventory: Inventory)=> inventory.product)
  inventories: Inventory[]
}
