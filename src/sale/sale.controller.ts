import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { SaleService } from './sale.service';
import { SaleCreateDto } from './dto/sale-create-dto';
import { CreditCreateDto } from 'src/credit/dto/credit-create-dto';
import { SaleCreditCreateDto } from 'src/sale-credit/dto/sale-credit-create-dto';

@Controller('sale')
@UseGuards(JwtAuthGuard)
export class SaleController {

    constructor(private readonly saleService: SaleService) {

    }

    @Post()
    async create(
        @Body('sale') sale: any,
        @Body('credit') credit: any,
        @Req() req: any
    ) {
        const userId = req.user.userId;
        //console.log("sale a guaradar: ", sale);
        console.log("credit a guaradar: ", credit);
        return await this.saleService.create(sale, userId, credit);
    }

    @Patch(':id/cancel')
    async cancel(
        @Param('id') id: number,
        @Req() req: any
    ) {
        console.log("llegando a cancelar la venta");
        const userId = req.user.userId;
        return await this.saleService.cancel(id, userId)
    }

    @Get()
    async getAll() {
        return await this.saleService.getAll();
    }

    @Get('/by-client-id')
    async getByClient(
        @Query('id') id: number
    ) {
        console.log("id: ", id);
        return await this.saleService.getByClient(id);
    }

    @Get('search')
    async search(
        @Query('startDate') startDate: Date,
        @Query('endDate') endDate: Date,
        @Query('status') status: string,
        @Query('paymentType') paymentType: string
    ) {
        // console.log("start: ", startDate);
        // console.log("end: ", endDate);
        // console.log("status: ", status);
        // console.log("payemntType: ", paymentType);
        return await this.saleService.search(startDate, endDate, status, paymentType);
    }


    @Get(':id/detail-annull')
    async getByIdDetailAnnull(
        @Param('id') id: number
    ) {
        return await this.saleService.getByIdDetailAnnull(id);
    }

    @Get(':id')
    async getById(
        @Param('id') id: number
    ) {
        return await this.saleService.getById(id);
    }

    @Delete(':id')
    async delete(
        @Param('id') id: number
    ) {
        return await this.saleService.delete(id);
    }

}
