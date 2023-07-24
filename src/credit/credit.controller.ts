import { Body, Controller, Post, UseGuards, Response, Get, Query } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreditCreateDto } from './dto/credit-create-dto';

@Controller('credit')
export class CreditController {
    constructor(private readonly creditService: CreditService) { }


    @Post()
    async create(
        @Body() createCreditDto: CreditCreateDto
    ) {
        console.log("credit recibido: ", createCreditDto);
        const userId = 1;
        return await this.creditService.create(createCreditDto, userId);
    }

    @Get('by-status')
    async byStatus(
        @Query('status') status) {
        return this.creditService.byStatus(status);
    }

    @Get('by-debt-collector')
    async ByDebtCollector(
        @Query('id') id
    ){
        return this.creditService.byDebtCollector(id);
    }

}
