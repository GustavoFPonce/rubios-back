export class TotalIndicatorDto{
    level: string;
    total: number;
    percentageTotal: string;
    records: number;
    percentageRecords: string;

    constructor(level: string, totalIndicatorPersonalCredit: any, totalIndicatorSaleCredit: any, totalRecords: number, totalCredits: number){
        const totalDto: TotalIndicatorDto ={
            level: level,
            total: parseFloat(totalIndicatorPersonalCredit.totalBalance) + parseFloat(totalIndicatorSaleCredit.totalBalance),
            percentageTotal: (totalCredits != 0)?((parseFloat(totalIndicatorPersonalCredit.totalBalance) + parseFloat(totalIndicatorSaleCredit.totalBalance))/totalCredits*100).toFixed(2): '0.00',
            records: parseFloat(totalIndicatorPersonalCredit.totalRecords) + parseFloat(totalIndicatorSaleCredit.totalRecords),
            percentageRecords: (totalRecords != 0)?((parseFloat(totalIndicatorPersonalCredit.totalRecords) + parseFloat(totalIndicatorSaleCredit.totalRecords))/totalRecords*100).toFixed(2): '0.00'
        };
        return totalDto;
    }
}