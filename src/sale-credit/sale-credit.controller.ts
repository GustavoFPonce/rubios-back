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

    @Get(':id')
    async getById(
        @Param('id') id: string
    ){
        //console.log("idCredit: ", id);
        return await this.saleCreditService.getById(id);
    }

    @Put(':id')
    async update(
        @Param('id') id: number,
        @Body() credit: any
    ) {
        var response = await this.saleCreditService.update(id, credit);
        return response;
    }

}
