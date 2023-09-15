import { IsArray, IsDate, IsDateString, IsNumber, IsString } from 'class-validator';


export class SaleCreditCreateDto{
    @IsNumber()
    readonly clientId: number;

    @IsNumber()
    readonly debtCollectorId: number;

    
    @IsString()
    readonly date: string;

    @IsString()
    readonly firstPayment: string;

    @IsNumber()
    readonly principal: number;

    @IsNumber()
    readonly interestRate: number;

    @IsString()
    readonly paymentFrequency: string;

    @IsNumber()
    readonly numberPayment: number;

    @IsNumber()
    readonly payment: number;

    @IsNumber()
    readonly commission: number;

}