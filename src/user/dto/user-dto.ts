import { Role } from "src/role/entities/role.entity";
import { User } from "../entities/user.entity";

export class UserDto {
    id: number;
    lastName: string;
    name: string;
    address: string;
    phoneNumber: string;
    roleName: string;
    email: string;
    userName: string;

    constructor(user: User) {
        const userDto: UserDto = {
            id: parseInt(user.id),
            lastName: user.lastName,
            name: user.name,
            address: user.address,
            phoneNumber: user.phoneNumber,
            roleName: `${RoleType[user.role.name]}`,
            email: user.email,
            userName: user.userName
        };
        return userDto;
    }
}


enum RoleType{
    'admin' = 'administrador/a',
    'debt-collector' = 'cobrador/a'
}

