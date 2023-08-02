import { IsPhoneNumber } from 'class-validator';
export class CollectionDto {
    id: number;
    client: string;
    informationClient: InformationClient;
    paymentDueDate: string;
    paymentDate: string;
    payment: number;
    balance: number



    constructor(paymentDetail: any) {
        const collectionDto: CollectionDto = {
            id: paymentDetail.id,
            client: paymentDetail.credit.client.lastName + " " + paymentDetail.credit.client.name,
            informationClient: {
                phoneNumber: paymentDetail.credit.client.phoneNumber,
                address: paymentDetail.credit.client.address,
                paymentInformation: paymentDetail.credit.information,
                email: null
            },
            paymentDueDate: paymentDetail.paymentDueDate,
            paymentDate: paymentDetail.paymentDate,
            payment: paymentDetail.payment,
            balance: parseInt(paymentDetail.balance)
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


