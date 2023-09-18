import { format } from "date-fns";

export class PaymentDetailDto {
    id: number;
    payment: number;
    actualPayment: number;
    paymentDueDate: string;
    paymentDate: string | null;
    balance: number;
    paymentType: string;

    constructor(paymentDetail: any, interest: number) {
        const paymentDetailDto: PaymentDetailDto = {
            id: paymentDetail.id,
            payment: paymentDetail.payment,
            actualPayment: paymentDetail.actualPayment,
            paymentDueDate: format(paymentDetail.paymentDueDate, "dd-MM-yyyy"),
            paymentDate: (paymentDetail.paymentDate) ? format(paymentDetail.paymentDate, "dd-MM-yyyy") : null,
            balance: paymentDetail.balance,
            paymentType: (paymentDetail.paymentType == 1)?'cuota':(interest< paymentDetail.payment)?'capital-interés':'interés',
        };
        return paymentDetailDto;
    }
}