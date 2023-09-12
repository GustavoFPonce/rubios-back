import { Sale } from "../entities/sale.entity";
import { parseISO } from 'date-fns';
import { SaleDetailDto } from "./sale-detail-dto";
import { SaleListDto } from "./sale-list-dto";

export class SaleDto extends SaleListDto{
    saleDetails: SaleDetailDto[];

    constructor(sale: Sale, saleDetails: SaleDetailDto[]) {
        super(sale);
        this.saleDetails = saleDetails;
    }
}