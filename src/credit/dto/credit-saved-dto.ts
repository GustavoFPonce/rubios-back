import { IsDateString, IsNumber, IsString } from "class-validator";

export class CreditSaved {
    @IsNumber()
    id: number;

    @IsNumber()
     clientId: number;

    @IsNumber()
     debtCollectorId: number;

    @IsDateString()
     date: string;

    @IsDateString()
     firstPayment: string;

    @IsNumber()
     principal: number;

    @IsNumber()
     interestRate: number;

    @IsString()
     paymentFrequency: string;

    @IsNumber()
    numberPayment: number;

    @IsNumber()
     payment: number;

    @IsString()
     information: string
}