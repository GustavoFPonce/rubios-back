import { Controller, Get, Post, UseGuards } from '@nestjs/common';
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

}
