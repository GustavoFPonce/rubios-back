import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ReportService } from './report.service';

@Controller('report')
//@UseGuards(JwtAuthGuard)
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

    @Get('total-balances')
    async getTotalBalances() {
        return await this.reportService.getTotalBalances();
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
        @Query('type') clientType: number
    ) {
        return await this.reportService.getExpiredCredits(clientType);
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

    @Get('pending-current-month')
    async getMoneyToCollectByMonthTotal(
    ) {
        return {
            pesos: {
                current: await this.reportService.getTotalToCollectInCurrentMonth("peso"),
                pending: await this.reportService.getMoneyPendingToCollectInCurrentMonth("peso"),
                paid: await this.reportService.getMoneyPaidCurrentMonth("peso"),
            },
            dolars: {
                current: await this.reportService.getTotalToCollectInCurrentMonth("dolar"),
                pending: await this.reportService.getMoneyPendingToCollectInCurrentMonth("dolar"),
                paid: await this.reportService.getMoneyPaidCurrentMonth("dolar"),
            }
        };
    }

    @Get('pending-current-week')
    async getMoneyToCollectInCurrentWeek(
    ) {
        return {
            pesos: {
                current: await this.reportService.getTotalToCollectInCurrentWeek("peso"),
                pending: await this.reportService.getMoneyPendingToCollectInCurrentWeek("peso"),
                paid: await this.reportService.getMoneyPaidCurrentWeek("peso"),
            },
            dolars: {
                current: await this.reportService.getTotalToCollectInCurrentWeek("dolar"),
                pending: await this.reportService.getMoneyPendingToCollectInCurrentWeek("dolar"),
                paid: await this.reportService.getMoneyPaidCurrentWeek("dolar"),                
            }
        };
    }

    @Get('total-expired-pending')
    async getTotalExpiredPending(
    ) {
        return {
            pesos: await this.reportService.getTotalExpiredPending("peso"),
            dolars: await this.reportService.getTotalExpiredPending("dolar")
        };
    }

    //sale
    @Get('sale-pending-current-month')
    async getSaleMoneyToCollectByMonthTotal(
    ) {
        return {
            pesos: {
                current: await this.reportService.getTotalToCollectInCurrentMonthSale("peso"),
                pending: await this.reportService.getMoneyPendingToCollectInCurrentMonthSale("peso"),
                paid: await this.reportService.getMoneyPaidCurrentMonthSale("peso"),
            },
            dolars: {
                current: await this.reportService.getTotalToCollectInCurrentMonthSale("dolar"),
                pending: await this.reportService.getMoneyPendingToCollectInCurrentMonthSale("dolar"),
                paid: await this.reportService.getMoneyPaidCurrentMonthSale("dolar"),
            }
        };
    }

    @Get('sale-pending-current-week')
    async getSaleMoneyToCollectInCurrentWeek(
    ) {
        return {
            pesos: {
                current: await this.reportService.getTotalToCollectInCurrentWeekSale("peso"),
                pending: await this.reportService.getMoneyPendingToCollectInCurrentWeekSale("peso"),
                paid: await this.reportService.getMoneyPaidCurrentWeekSale("peso"),
            },
            dolars: {
                current: await this.reportService.getTotalToCollectInCurrentWeekSale("dolar"),
                pending: await this.reportService.getMoneyPendingToCollectInCurrentWeekSale("dolar"),
                paid: await this.reportService.getMoneyPaidCurrentWeekSale("dolar"),                
            }
        };
    }

    @Get('sale-total-expired-pending')
    async getSaleTotalExpiredPending(
    ) {
        return {
            pesos: await this.reportService.getTotalExpiredPendingSale("peso"),
            dolars: await this.reportService.getTotalExpiredPendingSale("dolar")
        };
    }

}
