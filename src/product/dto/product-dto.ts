import { Product } from "../enities/product.entity";

export class ProductDto{
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    categoryId: string;
    stock: number;
    price: number


    constructor(product: Product){
        const productDto: ProductDto ={
            id: product.id,
            code: product.code,
            name: product.name,
            description: product.description,
            category: product.category.name,
            categoryId: product.category.id,
            stock: product.inventories.reduce((acumulador, inventario) => {
                return acumulador + inventario.amount;
              }, 0),
            price: product.price
        };
        return productDto;
    }
}