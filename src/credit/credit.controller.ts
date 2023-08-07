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
        @Body() credit: any
    ) {
        console.log("llegue a modificar créditos");
        var response = await this.creditService.update(id, credit);
        return response;
    }

    @Get()
    async getAll(
        @Req() req: any
    ) {
        const id = req.user.userId;
        console.log("id: ", id);
        return this.creditService.getAll(id);
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

    @Get(':id/payments-detail')
    async getPaymentsDetail(
        @Param('id') id: number
    ) {
        console.log("pidiendo detalle de los pagos: ", id);
        return this.creditService.getPaymentsDetail(id);
    }

    @Delete(':id')
    async delete(
        @Param('id') id: number
    ) {
        console.log("id: ", id);
        return await this.creditService.delete(id);
    }

    @Get('day')
    async getDay() {
        return this.creditService.getDay();
    }


    @Get('collections-by-day')
    async getCollectionsByDay(
        @Req() req: any
    ) {
        console.log("request: ", req.user);
        const userId = req.user.userId;
        return await this.creditService.getCollectionsByDay(userId);
    }

    @Put((':id/register-payment'))
    async registerPayment(
        @Param('id') id: number
    ) {
        return this.creditService.registerPayment(id);
    }

}
