import { format } from "date-fns";

export class PaymentDetailDto {
    id: number;
    payment: number;
    actualPayment: number;
    paymentDueDate: Date;
    paymentDate: Date | null;
    balance: number;
    paymentType: string;
    number: string

    constructor(paymentDetail: any, interest: any) {
        const paymentDetailDto: PaymentDetailDto = {
            id: paymentDetail.id,
            payment: paymentDetail.payment,
            actualPayment: paymentDetail.actualPayment,
            paymentDueDate: new Date(paymentDetail.paymentDueDate),
            paymentDate: (paymentDetail.paymentDate) ? new Date(paymentDetail.paymentDate) : null,
            balance: paymentDetail.balance,
            paymentType: (paymentDetail.paymentType == 1) ? 'cuota' : (parseFloat(interest) < parseFloat(paymentDetail.payment)) ? 'capital-interés' : 'interés',
            number: paymentDetail.numberPayment
        };
        return paymentDetailDto;
    }
}