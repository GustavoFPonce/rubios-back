import { format } from "date-fns";
import { StatusCredit } from "src/credit/enum";

export class LoanPrincipalDto {
    id: number;
    client: string;
    clientId: number;
    clientNumber: string;
    date: string;
    principal: number;
    status: string;
    type: string;



    constructor(credit: any, type: string) {
        //console.log("credit**: ", credit);
        const dto: LoanPrincipalDto = {
            id: credit.id,
            client: credit.client?.lastName + " " + credit.client?.name,
            clientId: credit.client?.id,
            clientNumber: credit.client?.clientNumber,
            date: format(credit.creditHistory[credit.creditHistory.length-1].date, "dd-MM-yyyy"),
            principal: credit.creditHistory[credit.creditHistory.length-1].principal,
            status: `${StatusCredit[credit.status]}`,
            type: type
        };
        //console.log("credit list dto class: ", credit);
        return dto;

    }
}