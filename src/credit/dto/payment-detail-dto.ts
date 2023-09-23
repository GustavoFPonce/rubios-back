import { format } from "date-fns";

export class PaymentDetailDto {
    id: number;
    payment: number;
    actualPayment: number;
    paymentDueDate: Date;
    paymentDate: Date | null;
    balance: number;
    paymentType: string;

    constructor(paymentDetail: any, interest: any) {
        const paymentDetailDto: PaymentDetailDto = {
            id: paymentDetail.id,
            payment: paymentDetail.payment,
            actualPayment: paymentDetail.actualPayment,
            paymentDueDate: new Date(paymentDetail.paymentDueDate),
            //paymentDueDate: format(paymentDetail.paymentDueDate, "dd-MM-yyyy"),
            paymentDate: (paymentDetail.paymentDate) ? new Date(paymentDetail.paymentDate) : null,
            // paymentDate: (paymentDetail.paymentDate) ? format(paymentDetail.paymentDate, "dd-MM-yyyy") : null,
            balance: paymentDetail.balance,
            paymentType: (paymentDetail.paymentType == 1) ? 'cuota' : (parseFloat(interest) < parseFloat(paymentDetail.payment)) ? 'capital-interés' : 'interés',
        };
        return paymentDetailDto;
    }
}