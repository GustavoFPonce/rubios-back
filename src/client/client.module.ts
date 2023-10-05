import { Module } from '@nestjs/common';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { CreditTransaction } from 'src/cash/entities/credit-transaction.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Client, CreditTransaction])],
  controllers: [ClientController],
  providers: [ClientService]
})
export class ClientModule {}
