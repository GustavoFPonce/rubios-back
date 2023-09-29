import { IsArray, IsNumber, IsString } from "class-validator";

export class SaleCreateDto{
    @IsString()
    date: string;

    @IsNumber()
    clientId: number;

    @IsNumber()
    total: number;

    @IsNumber()
    payment: number;

    @IsString()
    paymentType: string;

    @IsString()
    typeCurrency: string;

    @IsArray()
    saleDetails: []
    
}