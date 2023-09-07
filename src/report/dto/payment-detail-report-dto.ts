import { format } from "date-fns";
import { PaymentDetail } from "src/credit/entities/payment-detail.entity";

export class PaymentDetailReportDto{
    id: number;
    client: string;
    typeCurrency: string;
    paymentDueDate: string;
    payment: number;
    commission: string;
    accountability: Date;
    recoveryCommission: boolean;
    paymentDate: Date;
    paymentType: string;

    constructor(paymentDetail: PaymentDetail){
        const commissionDetailDto: PaymentDetailReportDto = {
            id: paymentDetail.id,
            client: paymentDetail.creditHistory.credit.client.lastName + " " + paymentDetail.creditHistory.credit.client.name,
            typeCurrency: paymentDetail.creditHistory.credit.typeCurrency,
            paymentDueDate: format(paymentDetail.paymentDueDate, 'dd-MM-yyyy'),
            payment: paymentDetail.payment,
            commission: getCommission(paymentDetail),
            accountability: paymentDetail.accountabilityDate,
            recoveryCommission: (paymentDetail.recoveryDateCommission)?true: false,
            paymentDate: paymentDetail.paymentDate,
            paymentType: (paymentDetail.paymentType == 1)?'cuota':'interés',
        };
        return commissionDetailDto
    }
}
 
    function getCommission(paymentDetail:any): string {
        const interest = paymentDetail.creditHistory.interest;
        const commissionRate = paymentDetail.creditHistory.credit.commission;
        const paymentsNumber = paymentDetail.creditHistory.credit.numberPayment;
        return (interest*commissionRate/100/paymentsNumber).toFixed(2);
        
    }
