import {
  Column,
  Entity,
  JoinTable,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Order } from '../../order/entities/order.entity';
import { Role } from '../../role/entities/role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  lastName: string;

  @Column()
  name: string;

  // @Column()
  // email: string;

  // @Column()
  // password: string;

  @Column()
  address: string;

  @Column()
  phoneNumber: string;

  // @Column()
  // refreshToken: string;

  @Column()
  role: number;
  
  // @ManyToOne(() => Role, (role: Role) => role.users)
  // role: Role;

  // @OneToMany(() => Order, (order: Order) => order.user)
  // orders: Order[];
}
