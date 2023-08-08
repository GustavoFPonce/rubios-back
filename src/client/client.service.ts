import { Injectable } from '@nestjs/common';
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
        return await this.clientRepository.find({ order: { id: 'DESC' } });
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
        var response = { success: false };
        const newClient = await this.clientRepository.create(client);
        const saveClient = await this.clientRepository.save(newClient);
        // console.log("response: ", saveClient);
        if (saveClient) response.success = true;
        return response;
    }

    async update(id: number, client: ClientCreateDto) {
        // console.log("cliente nuevos datos: ", client);
        var response = { success: false };
        var savedClient = await this.clientRepository.findOne(id);
        if (savedClient) {
            for (const [clave, valor] of Object.entries(client)) {
                savedClient[clave] = valor;
            };
            const responseClient = await this.clientRepository.save(savedClient);
            // console.log("response cliente modificado: ", savedClient);
            if (responseClient) response.success = true;
        }
        return response;
    }
}
