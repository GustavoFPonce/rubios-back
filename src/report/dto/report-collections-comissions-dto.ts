import { User } from "src/user/entities/user.entity";
import { PaymentDetailReportDto } from "./payment-detail-report-dto";
import { PaymentDetail } from "src/credit/entities/payment-detail.entity";
import { format } from "date-fns";

export class ReportCollectionsAndCommissionsDto{
    debtCollectorId: string;
    debtCollectorName: string;
    startDate: any;
    endDate: any;
    detailsReport: PaymentDetailReportDto[];

    constructor(debtCollector: User, details: PaymentDetailReportDto[], start?: Date, end?: Date){
        const reportDto: ReportCollectionsAndCommissionsDto ={
            debtCollectorId: debtCollector.id,
            debtCollectorName: debtCollector.lastName + " " + debtCollector.name,
            startDate: (start)?start: null,
            endDate: (start)?end: null,
            detailsReport: details
        };
        return reportDto;
    }
}