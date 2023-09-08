import { CommissionCreditDto } from "src/credit/dto/commission-credit-detail-dto";
import { CreditHistory } from "src/credit/entities/credit-history.entity";
import { User } from "src/user/entities/user.entity";

export class CommissionListDebtCollector {
    debtCollectorId: string;
    debtCollectorName: string;
    creditsDetailCommission: CommissionCreditDto[];

    constructor(debtCollector: User, creditsDetail: CommissionCreditDto[]) {
        const commissionList: CommissionListDebtCollector = {
            debtCollectorId: debtCollector.id,
            debtCollectorName: debtCollector.lastName + " " + debtCollector.name,
            creditsDetailCommission: creditsDetail
        };
        return commissionList;
    }
}