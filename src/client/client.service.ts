import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { async } from 'rxjs';
import { ClientCreateDto } from './dto/client-create-dto';
import { ClientListDto } from './dto/client-list-dto';
import { CreditTransaction } from 'src/cash/entities/credit-transaction.entity';
import { CreditTransactionDto } from '../cash/dto/credit-transactions-dto';

@Injectable()
export class ClientService {
    constructor(
        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>,
        @InjectRepository(CreditTransaction)
        private creditTransactionRepository: Repository<CreditTransaction>,) { }

    async all() {
        const clients = await this.clientRepository
            .createQueryBuilder('client')
            .orderBy('CAST(client.clientNumber AS SIGNED)', 'ASC') // Orden ascendente
            .getMany();

        return clients;
    }

    async getByName(name: string) {
        const filters = name.split(' ');
        // console.log("filters: ", filters);
        const clients = await this.clientRepository.createQueryBuilder('client')
            .where(new Brackets((qb) => {
                filters.forEach((term, index) => {
                    qb.orWhere('client.name LIKE :term' + index, { ['term' + index]: `%${term}%` })
                        .orWhere('client.lastName LIKE :term' + index, { ['term' + index]: `%${term}%` });
                });
            }))
            .orderBy('client.id', 'DESC')
            .getMany();
        return clients;
    }

    async search(type: string) {
        var clients = [];
        const types = type.split(' ');
        //console.log("types: ", types);
        if (type != 'all') {
            clients = await this.clientRepository.find({ type: parseInt(type) });
        } else {
            clients = await this.clientRepository.createQueryBuilder('client')
                .where(new Brackets((qb) => {
                    types.forEach((term, index) => {
                        qb.orWhere('client.type =:type', { ['term' + index]: `${term}` })
                    });
                }))
                .orderBy('client.id', 'DESC')
                .getMany();
            return clients;
        }

        //console.log("clientes filtrados: ", clients);
        return clients;
    }

    async delete(id: number) {
        var response = { success: false }
        const responseDelete = await this.clientRepository.delete(id);
        // console.log("response: ", responseDelete);
        if (responseDelete.affected > 0) response.success = true;
        return response;
    }

    async add(client: ClientCreateDto) {
        var response = { success: false, error: '' };
        const existClientNumber = await this.clientRepository.findOne({ clientNumber: client.clientNumber, type: client.type });
        if (!existClientNumber) {
            const newClient = await this.clientRepository.create(client);
            const saveClient = await this.clientRepository.save(newClient);
            if (saveClient) response.success = true;
        } else {
            response.success = false;
            response.error = `El número de ficha ${client.clientNumber} ya se encuentra registrado.`
        }
        return response;
    }

    async update(id: number, client: ClientCreateDto) {
        console.log("cliente nuevos datos: ", client);
        console.log("id: ", id);
        var response = { success: false, error: '' };
        var savedClient = await this.clientRepository.findOne(id);
       if(savedClient){
        const responseUpdateValues = await this.updateValuesClient(savedClient, client);
        response.success = responseUpdateValues;
        } else {
            throw new NotFoundException(`Cliente no registrado.`);
        }
        return response;
    }

    private async updateValuesClient(savedClient: Client, client: ClientCreateDto) {
        for (const [clave, valor] of Object.entries(client)) {
            savedClient[clave] = valor;
        };
        const responseClient = await this.clientRepository.save(savedClient);
        console.log("cliente modificado: ", responseClient);
        if (responseClient) return true;
    }

    async getByClientId(id: number, type: string) {
        if (id) {
            return await this.clientRepository.find({ where: { id: id, type: type } })
        } else {
            return this.search(type);
        }
    }

    async getById(id: number) {
        const client = await this.clientRepository.findOne(id)
        if (!client) {
            throw new NotFoundException(`There is no client under id ${id}`);
        }

        return client;
    }

    async getTransactions(id: number, type: number){
        console.log("type: ", type);
        const transactions = await this.creditTransactionRepository.createQueryBuilder('creditTransactions')
        .leftJoinAndSelect('creditTransactions.client', 'client')
        .leftJoinAndSelect('creditTransactions.credit', 'credit')
        .leftJoinAndSelect('creditTransactions.saleCredit', 'saleCredit')
        .where('creditTransactions.client_id = :id', {id})
        .getMany();
        return transactions.map(x=>{
            return new CreditTransactionDto(x, (type==1)? x.credit: x.saleCredit);
        })
    }
}


