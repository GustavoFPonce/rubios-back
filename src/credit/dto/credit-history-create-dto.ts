import { Credit } from "../entities/credit.entity";

export interface CreditHistoryCreateDto{
    date: Date;
    principal: number;
    interest: number;
    credit: Credit;
}