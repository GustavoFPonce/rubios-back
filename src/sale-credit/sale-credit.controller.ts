import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { SaleCreditService } from './sale-credit.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('sale-credit')
@UseGuards(JwtAuthGuard)
export class SaleCreditController {
    constructor(private readonly saleCreditService: SaleCreditService){}

 
    @Get()
    async getAll(
        @Req() req: any
    ) {
        const id = req.user.userId;
        return this.saleCreditService.getAll(id);
    }

    @Get('by-client')
    async getByClient(
        @Query('client') client: number,
        @Req() req: any
    ) {
        const userId = req.user.userId;
        return this.saleCreditService.getByClient(client, userId);
    }

    @Get(':id/payments-detail')
    async getPaymentsDetail(
        @Param('id') id: number
    ) {
        console.log("id credit history: ", id);
        return this.saleCreditService.getPaymentsDetail(id);
    }

    

    @Get(':id/credits-history')
    async getCreditsHistory(
        @Param('id') id: string
    ){
        return await this.saleCreditService.getCreditsHistory(id);
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
        console.log("user recibido: ", user);
        return await this.saleCreditService.searchCredits(status, user, currency, frequency, start, end);

    }

    @Put((':id/cancel-registered-payment'))
    async cancelRegisteredPayment(
        @Param('id') id: number
    ) {
        return this.saleCreditService.cancelRegisteredPayment(id);
    }

    @Put(':id')
    async update(
        @Param('id') id: number,
        @Body() credit: any
    ) {
        var response = await this.saleCreditService.update(id, credit);
        return response;
    }

    @Get('collections-by-client')
    async getCollectionsByClient(
        @Query('client') client: number,
        @Query('date') date: string,
        @Req() req: any
    ) {
        console.log("collections by client");
        const userId = req.user.userId;
        return this.saleCreditService.getCollectionsByClient(client, userId, date);
    }

    @Get('collections-by-date')
    async getCollectionsByDate(
        @Req() req: any,
        @Query('date') date: string,
    ) {

        const userId = req.user.userId;
        // console.log('date recibido: ', date);
        return await this.saleCreditService.getCollectionsByDate(userId, date);
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
        return await this.saleCreditService.searchCollections(userId, status, currency, debtcollector, startDate, endDate, statusPayment);

    }

    @Put((':id/register-payment'))
    async registerPayment(
        @Param('id') id: number,
        @Body('payment') payment: number,
    ) {
        console.log("paymemt recibido: ", payment);
        return this.saleCreditService.registerPayment(id, payment);
    }

    @Put((':id/register-cancellation-interest-principal'))
    async registerCancellationInterestPrincipal(
        @Param('id') id: number,
        @Body('payment') payment: number,
        @Body('firstPayment') firstPayment: number,

    ) {
        console.log("paymemt recibido: ", payment);
        return this.saleCreditService.registerCancellationInterestPrincipal(id, payment, firstPayment);
    }

    

    @Get(':id')
    async getById(
        @Param('id') id: string
    ){
        //console.log("idCredit: ", id);
        return await this.saleCreditService.getById(id);
    }

}
