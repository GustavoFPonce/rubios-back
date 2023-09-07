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

    @Patch('register-surrender-payments')
    async registerSurrenderPayment(
        @Query('id') id: string,
        @Query('start') start: any,
        @Query('end') end: any
    ){
        console.log("registrando rendición: ", start, end);
        return await this.reportService.registerSurrenderPayments(id, start, end);
    }

    @Patch('register-commissions-payments')
    async registerCommissionsPayment(
        @Query('id') id: string
    ){
        console.log("llegue a pagar comisiones: ", id);
        return await this.reportService.registerCommissionsPayments(id);
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
}
