import { Client } from '../entities/client.entity';
import { ClientType } from './client-create-dto';
export class ClientListDto{
    id: number;
    clientNumber: string;
    clientName: string;
    phoneNumber: string;
    address: string;
    type: string;

    constructor(client: Client){
        const clientDto: ClientListDto = {
            id: client.id,
            clientNumber: client.clientNumber,
            clientName: client.lastName + " " + client.name,
            phoneNumber: client.phoneNumber,
            address: client.address,
            type: (`${ClientType[client.type]}`)
        };
        return clientDto
    }
}