import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { Brackets, Repository, Between } from 'typeorm';
import { SaleCreateDto } from './dto/sale-create-dto';
import { Client } from 'src/client/entities/client.entity';
import { Product } from 'src/product/enities/product.entity';
import { parseISO } from 'date-fns';
import { SaleDetailCreateDto } from './dto/sale-detail-create-dto';
import { SaleDetail } from './entities/sale-detail.entity';
import { SaleStatus } from './enum';
import { ProductService } from 'src/product/product.service';
import { SaleDetailDto } from './dto/sale-detail-dto';
import { SaleDto } from './dto/sale-dto';
import { SaleListDto } from './dto/sale-list-dto';
import { getDateStartEnd } from 'src/common/get-date-start-end';
import { getDateLocal } from 'src/common/get-date-local';
import { SaleCreditCreateDto } from 'src/sale-credit/dto/sale-credit-create-dto';
import { SaleCreditService } from 'src/sale-credit/sale-credit.service';
import { SaleCreditHistory } from 'src/sale-credit/entities/sale-credit-history.entity';
import { SaleCreditDetailDto } from './dto/sale-credit-detail-dto';

@Injectable()
export class SaleService {

    constructor(
        @InjectRepository(Sale) private readonly saleRepository: Repository<Sale>,
        @InjectRepository(Client) private readonly clientRepository: Repository<Client>,
        @InjectRepository(Product) private readonly productRepository: Repository<Product>,
        @InjectRepository(SaleDetail) private readonly saleDetailRepository: Repository<SaleDetail>,
        private readonly productService: ProductService,
        private readonly saleCreditService: SaleCreditService
    ) { }


    async create(sale: SaleCreateDto, userId: number, credit: SaleCreditCreateDto | null) {
        var response = { success: false, error: '', message: '' };
        const client = await this.clientRepository.findOne(sale.clientId);
        var newSale = new Sale();
        newSale.client = client;
        newSale.date = new Date(sale.date);
        newSale.paymentType = sale.paymentType;
        newSale.payment = sale.payment;
        newSale.total = sale.total;
        newSale.status = SaleStatus.valid;
        newSale.userId = userId;
        const saleCreate = this.saleRepository.create(newSale);
        console.log("venta a guardar: ", saleCreate);
        const saleSaved = await this.saleRepository.save(saleCreate);
        await this.addSaleDetail(sale.saleDetails, saleSaved);
        if (saleSaved && credit) await this.saleCreditService.create(credit, userId, saleSaved)
    }

    async addSaleDetail(saleDetails: SaleDetailCreateDto[], sale: Sale) {
        saleDetails.forEach(async detail => {
            const product = await this.productRepository.findOne(detail.productId);
            var newSaleDetail = new SaleDetail();
            newSaleDetail.product = product;
            newSaleDetail.quantity = detail.quantity;
            newSaleDetail.price = detail.price;
            newSaleDetail.sale = sale;
            const detailSaleCreate = this.saleDetailRepository.create(newSaleDetail);
            await this.productService.affectStockBySale(product.id, -newSaleDetail.quantity);
            const detailSaleSaved = await this.saleDetailRepository.save(detailSaleCreate);
        });
    }


    async getByIdDetailAnnull(id: number) {
        const sale = await this.saleRepository.createQueryBuilder('sale')
            .leftJoinAndSelect('sale.saleCredit', 'saleCredit')
            .leftJoinAndSelect('sale.client', 'client')
            .leftJoinAndSelect('saleCredit.debtCollector', 'debtCollector')
            .leftJoinAndSelect('saleCredit.creditHistory', 'creditHistory')
            .leftJoinAndSelect('sale.saleDetails', 'saleDetails')
            .leftJoinAndSelect('saleDetails.product', 'product')
            .where('sale.id = :id', { id })
            .andWhere((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(creditHistory.id)')
                    .from(SaleCreditHistory, 'creditHistory')
                    .where('creditHistory.sale_credit_id = saleCredit.id')
                    .getQuery();
                return `creditHistory.id = ${subQuery}`;
            })
            .getOne();

        const saleDetailDto = sale.saleDetails.map(x => {
            return new SaleDetailDto(x);
        });
        const saleDto = new SaleCreditDetailDto(sale, saleDetailDto);
        console.log("sale obtenida: ", saleDto);
        return saleDto;
    }

    async getById(id: number) {
        const sale = await this.getSale(id);
        const saleDetailsDto = sale.saleDetails.map((x)=>{
            return new SaleDetailDto(x);
        });

        const saleDto = new SaleDto(sale, saleDetailsDto);
        return saleDto;
    }

    private async getSale(id: number) {
        return await this.saleRepository.findOne({ where: { id }, relations: ['saleDetails', 'client', 'saleDetails.product'] });
    }


    async cancel(id: number, userId: number) {
        var response = { success: false, error: '' };
        const sale = await this.getSale(id);
        if (!sale) throw new NotFoundException(`No se encontró la venta con el id: ${id}`);

        sale.status = SaleStatus.cancelled;
        const saleModify = true
        await this.saleRepository.save(sale);
        console.log('saleModify: ', saleModify);
        if (saleModify) {
            await this.returnStockBySaleDetail(sale.saleDetails);
            const responseAnnulCredit = await this.saleCreditService.annulSaleCredit(sale.id);
            response = { success: true, error: '' }
        } else {
            response = { success: false, error: 'No see pudo modificar el stock por la cancelación de la venta' }
        }
        return response;
    }

    private async returnStockBySaleDetail(saleDetails: SaleDetail[]) {
        saleDetails.forEach(async detail => {
            await this.productService.affectStockBySale(detail.product.id, detail.quantity);
        });
    }

    async getAll() {
        var referenceDate = new Date();
        var argentinaTime = new Date(referenceDate.setHours(referenceDate.getHours() - 3));
        const rangeDates = getDateStartEnd(argentinaTime, argentinaTime);
        const sales = await this.saleRepository.find({
            where: {
                date: Between(rangeDates.startDate, rangeDates.endDate)
            },
            relations: ['client'],
            order: { date: 'DESC', id: 'DESC' }
        });
        const salesDto = sales.map(x => {
            return new SaleListDto(x)
        });
        return salesDto;
    }

    async getByClient(id: number) {
        console.log("id cliente: ", id);
        var sales = [];
        if (id) {
            sales = await this.saleRepository.find(
                {
                    relations: ['client'],
                    where: { client: id },
                    order: { date: 'DESC', id: 'DESC' }
                })
            const salesDto = sales.map(x => {
                return new SaleListDto(x)
            });
            return salesDto;
        } else {
            return this.getAll();
        }
    }

    async search(
        start: Date,
        end: Date,
        status: string,
        paymentType: string
    ) {
        console.log("status: ", status);
        const rangesDate = getDateStartEnd(start, end);
        console.log("fechas: ", rangesDate);
        const sales = await this.saleRepository.createQueryBuilder('sales')
            .leftJoinAndSelect('sales.client', 'client')
            .where(new Brackets((qb) => {
                qb.where('sales.date BETWEEN :startDate AND :endDate',
                    { startDate: rangesDate.startDate, endDate: rangesDate.endDate });
                if (status != 'all') qb.andWhere('sales.status = :status', { status: parseInt(status) });
                if (paymentType != 'all') qb.andWhere('sales.paymentType = :paymentType', { paymentType })
            }))
            .addOrderBy('sales.date', 'DESC')
            .getMany();
        const salesDto = sales.map(x => {
            return new SaleListDto(x)
        });
        return salesDto;

    }

}
