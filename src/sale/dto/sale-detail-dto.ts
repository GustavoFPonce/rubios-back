import { SaleDetail } from "../entities/sale-detail.entity";

export class SaleDetailDto{
    id: number;
    code: string;
    productId: number;
    productName: string;
    quantity: number;
    price: number;
    total: number;

    constructor(saleDetail: SaleDetail){
        const saleDetailDto: SaleDetailDto = {
            id: saleDetail.id,
            code: saleDetail.product.code,
            productId: parseInt(saleDetail.product.id),
            productName: saleDetail.product.name,
            quantity: saleDetail.quantity,
            price: saleDetail.price,
            total: saleDetail.quantity*saleDetail.price
        };
        return saleDetailDto;
    }
}