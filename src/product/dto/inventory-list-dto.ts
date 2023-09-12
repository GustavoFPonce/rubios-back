import { format } from "date-fns";
import { Inventory } from "../enities/inventory";
import { OperationStock } from "../enum";

export class InventoryListDto {
    id: string;
    date: string;
    amount: number;
    costPesos: number;
    costDollar: number;
    concept: number;

    constructor(inventory: Inventory) {
        const inventoryDto: InventoryListDto = {
            id: inventory.id,
            date: format(inventory.date, 'dd-MM-yyyy'),
            amount: inventory.amount,
            costPesos: inventory.costPesos,
            costDollar: inventory.costDollar,
            concept: inventory.concept
        };
        return inventoryDto;
    }
}