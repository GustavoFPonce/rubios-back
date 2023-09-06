import { IsNumber, IsString } from "class-validator";
import { StatusPayment } from "../enum";

export class PaymentDetailCreateDto{    
    @IsString()
    readonly paymentDueDate: string;

    @IsString()
    readonly paymentDate: string;

    @IsNumber()
    readonly payment: number;

    status: StatusPayment
}
