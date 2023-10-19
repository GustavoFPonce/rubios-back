import { format } from "date-fns";
import { Sale } from "../entities/sale.entity";
import { SaleStatus } from "../enum";

export class SaleListDto{
    id: number;
    date: string;
    clientId: number;
    clientName: string;
    total: number;
    payment: number;
    paymentType: string;
    status: number;
    currencyType: string;
    creditId: any;

    constructor(sale: Sale) {
        const saleListDto: SaleListDto = {
            id: sale.id,
            date: format(sale.date, 'dd-MM-yyyy HH:mm:ss'),
            clientId: sale.client.id,
            clientName: sale.client.lastName +  " " + sale.client.name,
            total: sale.total,
            payment: sale.payment,
            paymentType: sale.paymentType,
            status: sale.status,
            currencyType: sale.currencyType,
            creditId: (sale.saleCredit)? sale.saleCredit.id: null
        };
        return saleListDto;
    }

}