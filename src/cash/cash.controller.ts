import { Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CashService } from './cash.service';

@Controller('cash')
@UseGuards(JwtAuthGuard)
export class CashController {
    constructor(private readonly cashService: CashService){}

     @Get('last')
     async getLastCash(){
        return await this.cashService.getLastCash();
     }

     @Post('open')
     async openCash(){
        return await this.cashService.openCash();
     }

     @Get('transactions')
     async getTransactions(
      @Query('id') id: string,
     ){
        return await this.cashService.getTransactions(id);
     }

     @Put(':id/close')
     async closeCash(
      @Param('id') id: number
     ){
        return await this.cashService.closeCash(id);
     }

}
