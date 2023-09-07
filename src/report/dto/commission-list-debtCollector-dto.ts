import { CommissionCreditDto } from "src/credit/dto/commission-credit-detail-dto";
import { CreditHistory } from "src/credit/entities/credit-history.entity";

export class CommissionListDebtCollector{
    debtCollectorId: string;
    debtCollectorName: string;
    creditsDetailCommission: CommissionCreditDto[]
    totalCommissionDollar: number;
    totalCommissionPeso: number

    constructor(credit: CreditHistory){
//         const commissionList: CommissionListDebtCollector={
//             debtCollectorId: credit.credit.debtCollector.id,
//             debtCollectorName: credit.credit.debtCollector.lastName + " " + credit.credit.debtCollector.name,
// creditsDetailCommission: credit.map
//         }
    }
}