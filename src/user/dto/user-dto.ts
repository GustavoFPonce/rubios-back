import { Role } from "src/role/entities/role.entity";
import { User } from "../entities/user.entity";

export class UserDto {
    id: number;
    name: string;
    address: string;
    phoneNumber: string;
    role: string;

    constructor(user: User) {
        const userDto: UserDto = {
            id: parseInt(user.id),
            name: user.lastName + " " + user.name,
            address: user.address,
            phoneNumber: user.phoneNumber,
            role: `${RoleType[user.role.name]}`
        };
        return userDto;
    }
}


enum RoleType{
    'admin' = 'administrador/a',
    'debt-collector' = 'cobrador/a'
}

