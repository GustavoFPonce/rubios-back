import { Body, Controller, Post, UseGuards, Response, Get, Query, Put, Param } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreditCreateDto } from './dto/credit-create-dto';
import { CreditSavedDto } from './dto/credit-saved-dto';

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
    ) {
        return this.creditService.byDebtCollector(id);
    }

    @Put(':id')
    async update(
        @Param('id') id: number,
        @Body() credit: CreditSavedDto
    ) {
        var response = await this.creditService.update(id, credit);
        return response;
    }

    @Get()
    async getAll() {
        return this.creditService.getAll();
    }

    @Get('by-status-date-range')
    async getByStatusByDateRange(
        @Query('status') status: any,
        @Query('startDate') startDate: any,
        @Query('endDate') endDate: any
    ) {
        console.log("status: ", status);
        console.log("startDate: ", startDate);
        console.log("endDate: ", endDate);
        return this.creditService.getByFilterStatusByDate(status, startDate, endDate);
    }

    @Get('by-client-name')
    async getByClientName(
        @Query('name') name: string
    ) {
        console.log("name: ", name);
        return this.creditService.getByClientName(name);
    }

}
