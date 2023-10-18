import { IsPhoneNumber } from 'class-validator';
import { format } from 'date-fns';
import { Client } from '../../client/entities/client.entity';
import { PaymentType } from '../enum';
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
    interest: number;
    principal: number;
    paymentType: string;
    statusCreditHistory: number;
    numberPayment: number;
    creditId: number;



    constructor(paymentDetail: any) {
        const collectionDto: CollectionDto = {
            id: paymentDetail.id,
            debtCollector: paymentDetail.creditHistory.credit.debtCollector.lastName + " " + paymentDetail.creditHistory.credit.debtCollector.name,
            client: paymentDetail.creditHistory.credit.client?.lastName + " " + paymentDetail.creditHistory.credit.client?.name,
            clientNumber: paymentDetail.creditHistory.credit.client?.clientNumber,
            informationClient: {
                phoneNumber: paymentDetail.creditHistory.credit.client?.phoneNumber,
                address: paymentDetail.creditHistory.credit.client?.address,
                paymentInformation: paymentDetail.creditHistory.credit.information,
                email: null
            },
            paymentDueDate: format(paymentDetail.paymentDueDate, "dd-MM-yyyy"),
            paymentDate: (paymentDetail.paymentDate)?format(paymentDetail.paymentDate, "dd-MM-yyyy"): null,
            payment: paymentDetail.payment,
            actualPayment: paymentDetail.actualPayment,
            balance: paymentDetail.creditHistory.balance,
            typeCurrency: paymentDetail.creditHistory.credit.typeCurrency,
            interest: paymentDetail.creditHistory.interest,
            principal: paymentDetail.creditHistory.principal,
            paymentType: (paymentDetail.paymentType == 1)?'cuota':'interés',
            statusCreditHistory: paymentDetail.creditHistory.status,
            numberPayment: paymentDetail.creditHistory.credit.numberPayment,
            creditId: paymentDetail.creditHistory.credit.id
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


