import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { async } from 'rxjs';
import { ClientCreateDto } from './dto/client-create-dto';

@Injectable()
export class ClientService {
    constructor(
        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>) { }

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

    async delete(id: number) {
        var response = { success: false }
        const responseDelete = await this.clientRepository.delete(id);
        // console.log("response: ", responseDelete);
        if (responseDelete.affected > 0) response.success = true;
        return response;
    }

    async add(client: ClientCreateDto) {
        var response = { success: false, error: '' };
        const existClientNumber = await this.clientRepository.findOne({ clientNumber: client.clientNumber });
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
        var response = { success: false, error: '' };
        var savedClient = await this.clientRepository.findOne(id);
        var existClientNumber: any = {};
        if (savedClient) {
            if (client.clientNumber != '') {
                existClientNumber = await this.clientRepository.findOne({ clientNumber: client.clientNumber });
                if (!existClientNumber || (existClientNumber.id == id)) {
                    console.log("1");
                    const responseUpdateValues = await this.updateValuesClient(savedClient, client);
                    response.success = responseUpdateValues;
                } else {
                    console.log("2");
                    response.success = false;
                    response.error = `El número de ficha ${client.clientNumber} ya se encuentra registrado.`
                }
            } else {
                console.log("3");
                const responseUpdateValues = await this.updateValuesClient(savedClient, client);
                response.success = responseUpdateValues;
            }

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
}


