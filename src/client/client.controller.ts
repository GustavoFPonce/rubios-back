import { Controller, Get, Inject } from '@nestjs/common';
import { ClientService } from './client.service';

@Controller('client')
export class ClientController {
    constructor(private readonly clientService: ClientService) { }


    @Get()
    async all() {
        const clients = await this.clientService.all();
        // console.log("clientes: ", clients );
        return clients;
    }
}
