import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CashService } from './cash.service';

@Controller('cash')
@UseGuards(JwtAuthGuard)
export class CashController {
   constructor(private readonly cashService: CashService) { }

   @Get('last')
   async getLastCash() {
      return await this.cashService.getLastCash();
   }

   @Post('open')
   async openCash() {
      return await this.cashService.openCash();
   }

   @Get('transactions')
   async getTransactions(
      @Query('id') id: string,
   ) {
      return await this.cashService.getTransactions(id);
   }

   @Post('add-revenue')
   async addRevenue(
      @Body() record: any,
      @Req() req: any
   ) {
      const userId = req.user.userId;
      return await this.cashService.addRevenue(record, userId);
   }

   @Post('add-expense')
   async addExpense(
      @Body() record: any,
      @Req() req: any
   ) {
      console.log("Expense: ", record);
      const userId = req.user.userId;
      return await this.cashService.addExpense(record, userId);
   }

   @Put(':id/close')
   async closeCash(
      @Param('id') id: number
   ) {
      return await this.cashService.closeCash(id);
   }

}
