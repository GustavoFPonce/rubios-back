import { CreditHistory } from "../entities/credit-history.entity";

export class CommissionCreditDto {
    creditHistoryId: number;
    client: string;
    date: Date;
    principal: number;
    interest: number;
    rateCommission: number;
    commission: number;
    typeCurrency: string;

    constructor(credit: CreditHistory) {
        const commissionCreditDto: CommissionCreditDto = {
            creditHistoryId: credit.id,
            client: credit.credit.client.lastName + " " + credit.credit.client.name,
            date: credit.date,
            principal: credit.principal,
            interest: credit.interest,
            rateCommission: credit.credit.commission,
            commission: credit.interest * credit.credit.commission / 100,
            typeCurrency: credit.credit.typeCurrency
        };
        return commissionCreditDto;
    }
}