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
        @Query('end') end: any,
        @Query('type') type: string
    ) {
        return await this.reportService.getChargesAccountedAndCollected(start, end, type);
    }

    @Get('payments-collected-pending')
    async getPaymentsCollectedAndPendingDetail(
        @Query('id') id: string,
        @Query('start') start: any,
        @Query('end') end: any,
        @Query('type') type: string
    ) {
        return await this.reportService.getPaymentsCollectedAndPendingDetail(id, start, end, type);
    }

    @Get('collections-commissions-detail')
    async getCollectionsAndCommissionsDetail(
        @Query('id') id: string,
        @Query('start') start: any,
        @Query('end') end: any,
        @Query('type') type: string
    ) {
        return await this.reportService.getCollectionsAndCommissionsDetail(id, start, end, type);
    }

    @Patch('register-accounted-payments')
    async registerAccountedPayments(
        @Query('id') id: string,
        @Query('start') start: any,
        @Query('end') end: any,
        @Query('type') type: string
    ) {
        // console.log("registrando rendición: ", start, end);
        return await this.reportService.registerAccountedPayments(id, start, end, type);
    }



    @Get('loan-principal')
    async getLoanPrincipal() {
        return await this.reportService.getPendingBalanceCredits();
    }

    @Patch('register-commissions-payments')
    async registerCommissionsPayment(
        @Query('id') id: number,
        @Query('type') type: string
    ) {
        console.log("llegue a pagar comisiones: ", id);
        return await this.reportService.registerCommissionsCredit(id, type);
    }

    @Get('commissions-total')
    async getCommissionsTotal(
        @Query('type') type: string
    ) {
        return await this.reportService.getCommissionsTotal(type);
    }

    @Get('total-balance')
    async getTotalBalance(
        @Query('currencyType') currencyType: string,
        @Query('year') year: string
    ) {
        return await this.reportService.getTotalBalance(currencyType, year);
    }

    @Get('total-balance-bad')
    async getTotalBalanceBadCredits(
        @Query('currencyType') currencyType: string,
        @Query('year') year: string
    ) {
        return await this.reportService.getTotalBalanceBadCredits(currencyType, year);
    }


    @Get('total-indicators')
    async getIndicators(
        @Query('currencyType') currencyType: string,
    ) {
        return await this.reportService.getTotalIndicators(currencyType);
    }

    @Get('monthly-credits')
    async getMonthlyCredits(
    ) {
        return await this.reportService.getMonthlyCredits();
    }

    @Get('expired-credit-count')
    async getMonthlyCreditCount(
    ) {
        return await this.reportService.getExpiredCreditCount();
    }

    @Get('expired-credits')
    async getExpiredCredits(
    ) {
        return await this.reportService.getExpiredCredits();
    }

    @Get('monthly-credit-amounts')
    async getMonthlyCreditAmounts(
    ) {
        return await this.reportService.getMonthlyAmountsCredits();
    }

    @Get('credits-by-debtcollector')
    async getCreditsByDebtCollector(
    ) {
        return await this.reportService.getCreditsByDebtCollector();
    }

    @Get('products')
    async getProducts(
        @Query('category') category: string,
        @Query('startDate') startDate: any,
        @Query('endDate') endDate: any
    ) {
        return await this.reportService.getProducts(category, startDate, endDate);
    }

    @Get(':id/commissions-credit-by-deb-collector')
    async getCommissionsCreditsByDebtCollector(
        @Param('id') id: number,
        @Query('type') type: string
    ) {
        return await this.reportService.getCommissionsCreditsByDebtCollector(id, type);
    }

    @Get(':id/collections-accounted-history')
    async getCollectionsAccountedHistory(
        @Param('id') id: string,
        @Query('start') start: any,
        @Query('end') end: any,
        @Query('type') type: string
    ) {
        return await this.reportService.getCollectionsAccountedHistory(id, start, end, type);
    }

    @Get(':id/commissions-credits-history')
    async getCommissionsCreditsHistory(
        @Param('id') id: number,
        @Query('type') type: string
    ) {
        return await this.reportService.getCommissionsCreditsHistory(id, type);
    }

    @Get(':id/payment-bhavior')
    async getPaymentBhavior(
        @Param('id') id: number,
        @Query('type') type: number,
        @Query('creditId') creditId: any
    ) {
        console.log("creditId: ", creditId);
        return await this.reportService.getPaymentBhavior(id, type, creditId);
    }

}
