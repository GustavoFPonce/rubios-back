import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ClientService {
    constructor(
        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>) { }

    async all() {
        return await this.clientRepository.find();
    }
}
