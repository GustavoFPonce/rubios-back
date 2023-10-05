import { Controller, Get, Inject, Query, UseGuards, Delete, Param, Post, Body, Put } from '@nestjs/common';
import { ClientService } from './client.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ClientCreateDto } from './dto/client-create-dto';

@Controller('client')
@UseGuards(JwtAuthGuard)
export class ClientController {
    constructor(private readonly clientService: ClientService) { }


    @Get()
    async all() {
        const clients = await this.clientService.all();
        // console.log("clientes: ", clients );
        return clients;
    }
    

    @Get('by-name')
    async getByName(
        @Query('name') name: string
    ) {
        console.log("name: ", name);
        return await this.clientService.getByName(name);
    }

    @Delete(':id')
    async delete(
        @Param('id') id: number
    ) {
        //console.log("id: ", id);
        return this.clientService.delete(id)
    }

    @Post()
    async create(
        @Body() client: ClientCreateDto
    ) {
        console.log("nuevo cliente: ", client);
        return this.clientService.add(client);
    }

    @Put(':id')
    async update(
        @Param('id') id: number,
        @Body() client: ClientCreateDto
    ) {
        //console.log("editar cliente: ", client);
        return this.clientService.update(id, client);
    }

  
    @Get('search')
    async search(
        @Query('type') type: string
    ){
       // console.log("tipo recibido: ", type);
        return await this.clientService.search(type);
    }

    @Get('client')
    async getByClientId(
        @Query('client') id: number,
        @Query('type') type: string
    ){
       //console.log("id: ", id);
        return await this.clientService.getByClientId(id, type);
    }

    @Get(':id/transactions')
    async getTransactions(
        @Param('id') id: number,
        @Query('type') type: number
    ){
        return await this.clientService.getTransactions(id, type);
    }

    @Get(':id')
    async getById(
        @Param('id') id: number
    ){
      // console.log("id: ", id);
        return await this.clientService.getById(id);
    }
}
