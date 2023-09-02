import { IsPhoneNumber } from 'class-validator';
import { format } from 'date-fns';
import { Client } from '../../client/entities/client.entity';
export class CollectionDto {
    id: number;
    debtCollector: string;
    client: string;
    clientNumber: string;
    informationClient: InformationClient;
    paymentDueDate: string;
    paymentDate: string;
    payment: number;
    actualPayment: number;
    balance: number;
    typeCurrency: string;



    constructor(paymentDetail: any) {
        const collectionDto: CollectionDto = {
            id: paymentDetail.id,
            debtCollector: paymentDetail.credit.debtCollector.lastName + " " + paymentDetail.credit.debtCollector.name,
            client: paymentDetail.credit.client.lastName + " " + paymentDetail.credit.client.name,
            clientNumber: paymentDetail.credit.client.clientNumber,
            informationClient: {
                phoneNumber: paymentDetail.credit.client.phoneNumber,
                address: paymentDetail.credit.client.address,
                paymentInformation: paymentDetail.credit.information,
                email: null
            },
            paymentDueDate: format(paymentDetail.paymentDueDate, "dd-MM-yyyy"),
            paymentDate: (paymentDetail.paymentDate)?format(paymentDetail.paymentDate, "dd-MM-yyyy"): null,
            payment: paymentDetail.payment,
            actualPayment: paymentDetail.actualPayment,
            balance: paymentDetail.balance,
            typeCurrency: paymentDetail.credit.typeCurrency
        };
        return collectionDto;
    }
}


class InformationClient {
    phoneNumber: string;
    address: string;
    paymentInformation: string;
    email: string;
}


