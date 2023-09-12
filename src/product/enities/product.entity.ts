import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Category } from 'src/category/entities/category.entity';
import { Inventory } from './inventory';
import { SaleDetail } from 'src/sale/entities/sale-detail.entity';

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
  pricePesos: number;

  @Column()
  priceDollar: number;

  @ManyToOne(
    () => Category, (category: Category) => category.products)
    @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(()=> Inventory, (inventory: Inventory)=> inventory.product)
  inventories: Inventory[]

  @OneToMany(()=>SaleDetail, (detail: SaleDetail)=> detail.product)
  saleDetails: SaleDetail[]
}
