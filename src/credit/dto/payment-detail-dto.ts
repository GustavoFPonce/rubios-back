import { format } from "date-fns";

export class PaymentDetailDto {
    id: number;
    payment: number;
    paymentDueDate: string;
    paymentDate: string | null;
    balance: number;

    constructor(paymentDetail: any) {
        const paymentDetailDto: PaymentDetailDto = {
            id: paymentDetail.id,
            payment: paymentDetail.payment,
            paymentDueDate: format(paymentDetail.paymentDueDate, "dd-MM-yyyy"),
            paymentDate: (paymentDetail.paymentDate) ? format(paymentDetail.paymentDate, "dd-MM-yyyy") : null,
            balance: paymentDetail.balance
        };
        return paymentDetailDto;
    }
}