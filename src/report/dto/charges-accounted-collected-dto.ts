import { PaymentDetail } from "src/credit/entities/payment-detail.entity";

export class TotalChargeAccountedCollected {
    debtCollectorId: string;
    debtCollectorName: string;
    totalPaymentsReceivablesPesos: number;
    totalPaymentsReceivablesDollar: number;
    totalPaymentsCollectedPesos: number;
    totalPaymentsCollectedDollar: number;

    constructor(detail: any) {
        const detailDto: TotalChargeAccountedCollected = {
            debtCollectorId: detail.debtCollectorId,
            debtCollectorName: detail.debtCollectorName,
            totalPaymentsReceivablesPesos: detail.totalPaymentsReceivablesPesos,
            totalPaymentsReceivablesDollar: detail.totalPaymentsReceivablesDollar,
            totalPaymentsCollectedPesos: detail.totalPaymentsCollectedPesos,
            totalPaymentsCollectedDollar: detail.totalPaymentsCollectedDollar,
        };
        return detailDto;
    }
}