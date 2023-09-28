export class ExpenseCreateDto{
    user: string;
    concept: string;
    type: ExpenseType;
    currencyType: string;
    amount: number
}

export enum ExpenseType{
    'cancellationPayment' = 1,
}