import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Client{

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    lastName: string;

    @Column()
    name: string;

    @Column()
    address: string;

    @Column()
    phoneNumber: string;
}