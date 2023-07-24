import { IsString } from "class-validator";

export class ClientCreateDto{
    
    @IsString()
    lastName: string;

    @IsString()
    name: string;

    @IsString()
    address: string;

    @IsString()
    phone: string;
}