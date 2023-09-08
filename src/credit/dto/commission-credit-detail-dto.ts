import { format } from "date-fns";
import { CreditHistory } from "../entities/credit-history.entity";

export class CommissionCreditDto {
    creditHistoryId: number;
    client: string;
    date: string;
    principal: number;
    interest: number;
    rateCommission: number;
    commission: number;
    typeCurrency: string;
    commissionPaymentDate: string;

    constructor(credit: CreditHistory) {
        const commissionCreditDto: CommissionCreditDto = {
            creditHistoryId: credit.id,
            client: credit.credit.client.lastName + " " + credit.credit.client.name,
            date: format(credit.date, 'dd-MM-yyyy'),
            principal: credit.principal,
            interest: credit.interest,
            rateCommission: credit.credit.commission,
            commission: parseFloat((credit.interest * credit.credit.commission / 100).toFixed(2)),
            typeCurrency: credit.credit.typeCurrency,
            commissionPaymentDate: (credit.commissionPaymentDate)?format(credit.commissionPaymentDate, 'dd-MM-yyyy'):('-'),
        };
        return commissionCreditDto;
    }
}