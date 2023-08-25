import { PaymentDetail } from "src/credit/entities/payment-detail.entity";

export class CommissionDto {
    debtCollectorId: string;
    debtCollectorName: string;
    totalAccountability: number;
    totalPaymentsRecovery: number;
    status: string;

    constructor(paymentDetail: PaymentDetail) {
        const commissionDto: CommissionDto = {
            debtCollectorId: paymentDetail.credit.debtCollector.id,
            debtCollectorName: paymentDetail.credit.debtCollector.lastName + " " + paymentDetail.credit.debtCollector.name,
            totalAccountability: 1000,
            totalPaymentsRecovery: 1000,
            status: 'rendido'
        };
        return commissionDto;
    }
}