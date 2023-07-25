import { IsDate, IsDateString, IsNumber, IsString } from 'class-validator';


export class CreditCreateDto{
    @IsNumber()
    readonly clientId: number;

    @IsNumber()
    readonly debtCollectorId: number;

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

    @IsString()
    readonly information: string


}