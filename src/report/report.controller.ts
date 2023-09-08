import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ReportService } from './report.service';

@Controller('report')
@UseGuards(JwtAuthGuard)
export class ReportController {
    constructor(private readonly reportService: ReportService) { }

    @Get('charges-accounted-collected')
    async getChargesAccountedAndCollected(
        @Query('start') start: any,
        @Query('end') end: any
    ){
        console.log("start controller: ", start);
        console.log("end controller: ", end);
        return await this.reportService.getChargesAccountedAndCollected(start, end);
    }

    @Get('collections-commissions-detail')
    async getCollectionsAndCommissionsDetail(
        @Query('id') id: string,
        @Query('start') start: any,
        @Query('end') end: any
    ){
        return await this.reportService.getCollectionsAndCommissionsDetail(id, start, end);
    }

    @Patch('register-accounted-payments')
    async registerAccountedPayments(
        @Query('id') id: string,
        @Query('start') start: any,
        @Query('end') end: any
    ){
        console.log("registrando rendición: ", start, end);
        return await this.reportService.registerAccountedPayments(id, start, end);
    }

    @Patch('register-commissions-payments')
    async registerCommissionsPayment(
        @Query('id') id: number
    ){
        console.log("llegue a pagar comisiones: ", id);
        return await this.reportService.registerCommissionsCredit(id);
    }

    @Get('commissions-total')
    async getCommissionsTotal(){
        return await this.reportService.getCommissionsTotal();
    }

    @Get(':id/commissions-credit-by-deb-collector')
    async getCommissionsCreditsByDebtCollector(
        @Param('id') id: number
    ){
        return await this.reportService.getCommissionsCreditsByDebtCollector(id);
    }

    @Get(':id/collections-accounted-history')
    async getCollectionsAccountedHistory(
        @Param('id') id: string,
        @Query('start') start: any,
        @Query('end') end: any
    ){
        return await this.reportService.getCollectionsAccountedHistory(id, start, end);
    }

    @Get(':id/commissions-credits-history')
    async getCommissionsCreditsHistory(
        @Param('id') id: number
    ){
        return await this.reportService.getCommissionsCreditsHistory(id);
    }

}
