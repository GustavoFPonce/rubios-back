import { Body, Controller, Post, UseGuards, Response, Get, Query, Put, Param, Delete, Req } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreditCreateDto } from './dto/credit-create-dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('credit')
@UseGuards(JwtAuthGuard)
export class CreditController {
    constructor(private readonly creditService: CreditService) { }


    @Post()
    async create(
        @Body() createCreditDto: CreditCreateDto
    ) {
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
        @Body() credit: any
    ) {
        var response = await this.creditService.update(id, credit);
        return response;
    }

    @Get()
    async getAll(
        @Req() req: any
    ) {
        const id = req.user.userId;
        return this.creditService.getAll(id);
    }

    @Get('by-client-name')
    async getByClientName(
        @Query('name') name: string
    ) {
        return this.creditService.getByClientName(name);
    }

    @Get(':id/payments-detail')
    async getPaymentsDetail(
        @Param('id') id: number
    ) {
        return this.creditService.getPaymentsDetail(id);
    }

    @Delete(':id')
    async delete(
        @Param('id') id: number
    ) {
        return await this.creditService.delete(id);
    }

    @Get('day')
    async getDay(
    ) {
        return this.creditService.getDay();
    }


    @Get('collections-by-date')
    async getCollectionsByDate(
        @Req() req: any,
        @Query('date') date: string,
    ) {

        const userId = req.user.userId;
        return await this.creditService.getCollectionsByDate(userId, date);
    }

    @Put((':id/register-payment'))
    async registerPayment(
        @Param('id') id: number,
        @Body('payment') payment: number,
    ) {
        console.log("paymemt recibido: ", payment);
        return this.creditService.registerPayment(id, payment);
    }

    @Get('search-collections')
    async searchCollections(
        @Req() req: any,
        @Query('status') status: string,
        @Query('currency') currency: string,
        @Query('user') debtcollector: string,
        @Query('startDate') startDate: any,
        @Query('endDate') endDate: any,
        @Query('statusPayment') statusPayment: string,
    ) {
        console.log("startDate: ", startDate);
        console.log("endDate: ", endDate);
        const userId = req.user.userId;
        return await this.creditService.searchCollections(userId, status, currency, debtcollector, startDate, endDate, statusPayment);

    }


    @Get('search')
    async searchByFilter(
        @Query('status') status: any,
        @Query('user') user: string,
        @Query('currency') currency: string,
        @Query('frequency') frequency: string,
        @Query('startDate') startDate: any,
        @Query('endDate') endDate: any
    ) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return await this.creditService.searchCredits(status, user, currency, frequency, start, end);

    }


    @Get(':id')
    async getById(
        @Param('id') id: string
    ){
        return await this.creditService.getById(id);
    }


}
