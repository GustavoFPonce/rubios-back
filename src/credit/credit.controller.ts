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
        console.log("creditCreate: ", createCreditDto);
        return await this.creditService.create(createCreditDto, userId);
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

    @Get('by-client')
    async getByClient(
        @Query('client') client: number,
        @Req() req: any
    ) {
        const userId = req.user.userId;
        return this.creditService.getByClient(client, userId);
    }

    @Get('collections-by-client')
    async getCollectionsByClient(
        @Query('client') client: number,
        @Query('date') date: string,
        @Req() req: any
    ) {
        console.log("collections by client");
        const userId = req.user.userId;
        return this.creditService.getCollectionsByClient(client, userId, date);
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
        console.log("id delete: ", id);
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
        // console.log('date recibido: ', date);
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

    @Put((':id/register-cancellation-interest-principal'))
    async registerCancellationInterestPrincipal(
        @Param('id') id: number,
        @Body('payment') payment: number,
        @Body('firstPayment') firstPayment: number,
    ) {
        console.log("paymemt recibido: ", payment);
        return this.creditService.registerCancellationInterestPrincipal(id, payment, firstPayment);
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
        @Query('endDate') endDate: any,
        @Req() req:any
    ) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
       if(user == 'null') user = req.user.userId;
        //console.log("user recibido: ", user);
        return await this.creditService.searchCredits(status, user, currency, frequency, start, end);

    }


    @Get(':id')
    async getById(
        @Param('id') id: string
    ){
        return await this.creditService.getById(id);
    }

    @Get(':id/credits-history')
    async getCreditsHistory(
        @Param('id') id: string
    ){
        console.log("id: ", id);
        return await this.creditService.getCreditsHistory(id);
    }


}
