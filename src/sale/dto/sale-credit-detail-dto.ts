import { SaleCredit } from "src/sale-credit/entities/sale-credit.entity";
import { SaleDetailDto } from "./sale-detail-dto";
import { Sale } from "../entities/sale.entity";
import { format } from "date-fns";

export class SaleCreditDetailDto {
    id: number;
    clientId: number;
    total: number;
    paymentSale: number;
    paymentType: string;
    saleDetails: SaleDetailDto[];
    date: Date;
    firstPayment: Date;
    debtCollectorId: string;
    paymentFrequency: string;
    numberPayment: number;
    commission: number;
    interestRate: number;
    payment: number;
    typeCurrency: string;
    downPayment: number;


    constructor(sale: Sale, saleDetails: SaleDetailDto[]) {
        const saleDto: SaleCreditDetailDto = {
            id: sale.id,
            clientId: sale.client.id,
            total: sale.total,
            paymentSale: sale.payment,
            paymentType: sale.paymentType,
            saleDetails: saleDetails,
            date: sale.date,
            firstPayment: (sale.saleCredit)?(sale.saleCredit.creditHistory[sale.saleCredit.creditHistory.length-1].firstPayment):sale.date,
            debtCollectorId: (sale.saleCredit)?sale.saleCredit.debtCollector.id: null,
            paymentFrequency: (sale.saleCredit)?sale.saleCredit.paymentFrequency:'Un pago',
            numberPayment: (sale.saleCredit)?sale.saleCredit.numberPayment:1,
            commission: (sale.saleCredit)?sale.saleCredit.commission: null,
            interestRate: (sale.saleCredit)?sale.saleCredit.interestRate: null,
            payment: (sale.saleCredit)?sale.saleCredit.creditHistory[sale.saleCredit.creditHistory.length-1].payment: sale.total,
            typeCurrency: (sale.saleCredit)?sale.saleCredit.typeCurrency:'',
            downPayment: (sale.saleCredit)? sale.saleCredit.downPayment:0
        };
        return saleDto;
    }
}