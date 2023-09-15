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

    constructor(sale: Sale, saleDetails: SaleDetailDto[]) {
        const saleDto: SaleCreditDetailDto = {
            id: sale.id,
            clientId: sale.client.id,
            total: sale.total,
            paymentSale: sale.payment,
            paymentType: sale.paymentType,
            saleDetails: saleDetails,
            date: sale.date,
            firstPayment: sale.saleCredit.creditHistory[sale.saleCredit.creditHistory.length-1].firstPayment,
            debtCollectorId: sale.saleCredit.debtCollector.id,
            paymentFrequency: sale.saleCredit.paymentFrequency,
            numberPayment: sale.saleCredit.numberPayment,
            commission: sale.saleCredit.commission,
            interestRate: sale.saleCredit.interestRate,
            payment: sale.saleCredit.creditHistory[sale.saleCredit.creditHistory.length-1].payment
        };
        return saleDto;
    }
}