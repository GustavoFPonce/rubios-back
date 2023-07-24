import { IsDate, IsDateString, IsNumber, IsString } from 'class-validator';


export class CreditCreateDto{
    @IsNumber()
    readonly clientId: Number;

    @IsNumber()
    readonly debtCollectorId: Number;

    @IsString()
    readonly firstPayment: string;

    @IsNumber()
    readonly principal: Number;

    @IsNumber()
    readonly interestRate: Number;

    @IsString()
    readonly paymentFrequency: String;

    @IsNumber()
    readonly numberPayment: Number;

    @IsNumber()
    readonly payment: Number;

    @IsString()
    readonly information: String


}