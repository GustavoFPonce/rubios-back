import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cash } from './entities/cash.entity';
import { IsNull, Repository } from 'typeorm';
import { ExpenseCreateDto } from './dto/expense-create-dto';
import { Expense } from './entities/expense.entity';
import { TransactionDto } from './dto/transactions-dto';
import { CreditTransactionCreateDto } from './dto/credit-transaction-create-dto';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { User } from 'src/user/entities/user.entity';
import { TransactionType } from './dto/enum';
import { Revenue } from './entities/revenue.entity';

@Injectable()
export class CashService {
    constructor(
        @InjectRepository(Cash) private cashRepository: Repository<Cash>,
        @InjectRepository(Revenue) private revenueRepository: Repository<Revenue>,
        @InjectRepository(Expense) private expenseRepository: Repository<Expense>,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(CreditTransaction) private creditTransactionRepository: Repository<CreditTransaction>,
    ) { }

    async getLastCash() {
        return this.cashRepository.findOne({ order: { id: 'DESC' } });
    }

    async openCash() {
        var response = { success: false, error: '', cash: null }
        const cash = new Cash();
        cash.openingDate = new Date();
        cash.closingDate = null;
        cash.totalRevenuePeso = 0.00;
        cash.totalRevenueDollar = 0.00;
        cash.totalExpensePeso = 0.00;
        cash.totalExpenseDollar = 0.00;
        cash.openingBalancePeso = 0.00;
        cash.openingBalanceDollar = 0.00;
        cash.closingBalancePeso = 0.00;
        cash.closingBalanceDollar = 0.00;

        const lastCash = await this.getLastCash();
        if (lastCash) {
            cash.openingBalancePeso = lastCash.closingBalancePeso;
            cash.openingBalanceDollar = lastCash.closingBalanceDollar;
            cash.closingBalancePeso = 0.00;
            cash.closingBalanceDollar = 0.00;
        };
        const newCash = this.cashRepository.create(cash);
        const responseSaved = await this.cashRepository.save(newCash);
        if (responseSaved) {
            response.success = true;
            response.cash = responseSaved;
        }
        return response;
    }

    async getTransactions(id: string) {
        const transactionsQuery: any = await this.cashRepository.createQueryBuilder('cash')
            .leftJoinAndSelect('cash.revenues', 'revenues')
            .leftJoinAndSelect('revenues.user', 'userRevenue')
            .leftJoinAndSelect('cash.expenses', 'expenses')
            .leftJoinAndSelect('expenses.user', 'userExpense')
            .leftJoinAndSelect('cash.sales', 'sales')
            .leftJoinAndSelect('sales.client', 'clientSale')
            .leftJoinAndSelect('cash.creditTransaction', 'creditTransactions')
            .leftJoinAndSelect('creditTransactions.credit', 'credit')
            .leftJoinAndSelect('credit.client', 'clientCredit')
            .leftJoinAndSelect('creditTransactions.saleCredit', 'saleCredit')
            .leftJoinAndSelect('saleCredit.client', 'clientSaleCredit')
            .leftJoinAndSelect('creditTransactions.creditTransactionsDetails', 'creditTransactionsDetails')
            .where('cash.id = :id', { id })
            .getOne();
        var transactions = [];
        transactionsQuery.revenues?.map(x => {
            transactions.push(x);
        });
        transactionsQuery.expenses?.map(x => {
            transactions.push(x);
        });
        transactionsQuery.creditTransaction?.map(x => {
            if (x.accounted) transactions.push(x);
        })
        transactionsQuery.sales?.map(x => {
            transactions.push(x);
        })
        transactions.sort((a, b) => {
            if (a.date.getTime() !== b.date.getTime()) {
                return b.date.getTime() - a.date.getTime();
            }
        });
        var transactionsDto: TransactionDto[] = [];
        transactions.map(x => {
            if (x instanceof CreditTransaction) {
                transactionsDto.push(
                    new TransactionDto(x, (x.credit) ? x.credit : x.saleCredit));
            } else {
                transactionsDto.push(
                    new TransactionDto(x));
            }
        })
        return transactionsDto
    }

    async createTransaction(transaction: CreditTransactionCreateDto) {
        const trasactionCreate = new CreditTransaction();
        trasactionCreate.client = transaction.client;
        trasactionCreate.user = transaction.user;
        trasactionCreate.type = transaction.type;
        trasactionCreate.concept = transaction.concept;
        trasactionCreate.currencyType = transaction.currencyType;
        trasactionCreate.credit = (transaction.client.type == 1) ? transaction.credit : null;
        trasactionCreate.saleCredit = (transaction.client.type == 2) ? transaction.credit : null;
        trasactionCreate.amount = transaction.amount;
        trasactionCreate.cash = transaction.cash;
        trasactionCreate.date = new Date();
        trasactionCreate.creditTransactionsDetails = [];
        trasactionCreate.accounted = transaction.accounted;
        const newTransaction = this.creditTransactionRepository.create(trasactionCreate);
        const responseSaveTrasaction = await this.creditTransactionRepository.save(newTransaction);
        return responseSaveTrasaction;
    }


    async addCreditTransactionDetail(creditTransaction: CreditTransaction) {
        const response = await this.creditTransactionRepository.save(creditTransaction);
        console.log("response: ", response);
    }

    async closeCash(id: number) {
        var response = { success: false, error: '' }
        var cash = await this.cashRepository.findOne({ where: { id }, relations: ['revenues', 'expenses', 'creditTransaction', 'sales'] });
        var totalRevenuePeso = 0;
        var totalRevenueDollar = 0;
        var totalExpensePeso = 0;
        var totalExpenseDollar = 0;
        totalRevenuePeso = totalRevenuePeso + cash.revenues.filter(x => x.currencyType == 'peso').reduce((total, revenue) => total + parseFloat(revenue.amount.toString()), 0);
        var totalRevenueDollar = cash.revenues.filter(x => x.currencyType == 'dolar').reduce((total, revenue) => total + parseFloat(revenue.amount.toString()), 0);
        var totalExpensePeso = cash.expenses.filter(x => x.currencyType == 'peso').reduce((total, revenue) => total + parseFloat(revenue.amount.toString()), 0);
        var totalExpenseDollar = cash.expenses.filter(x => x.currencyType == 'dolar').reduce((total, revenue) => total + parseFloat(revenue.amount.toString()), 0);
        totalRevenuePeso = totalRevenuePeso + cash.sales.filter(x => x.currencyType == 'peso').reduce((total, sale) => total + parseFloat(sale.total.toString()), 0);
        totalRevenueDollar = totalRevenueDollar + cash.sales.filter(x => x.currencyType == 'dolar').reduce((total, sale) => total + parseFloat(sale.total.toString()), 0);
        totalRevenuePeso = totalRevenuePeso + cash.creditTransaction.filter(x => x.currencyType === 'peso' && x.accounted && (x.type === TransactionType.payment || x.type === TransactionType.paymentInterest || x.type === TransactionType.downPayment)).reduce((total, transaction) => total + parseFloat(transaction.amount.toString()), 0);
        totalRevenueDollar = totalRevenueDollar + cash.creditTransaction.filter(x => x.currencyType == 'dolar' && x.accounted && (x.type === TransactionType.payment || x.type === TransactionType.paymentInterest || x.type === TransactionType.downPayment)).reduce((total, transaction) => total + parseFloat(transaction.amount.toString()), 0);
        totalExpensePeso = totalExpensePeso + cash.creditTransaction.filter(x => x.currencyType == 'peso' && x.accounted && (x.type === TransactionType.cancellationPayment || x.type === TransactionType.cancellationPaymentInterest)).reduce((total, transaction) => total + parseFloat(transaction.amount.toString()), 0);
        totalExpenseDollar = totalExpenseDollar + cash.creditTransaction.filter(x => x.currencyType == 'dolar' && x.accounted && (x.type === TransactionType.cancellationPayment || x.type === TransactionType.cancellationPaymentInterest)).reduce((total, transaction) => total + parseFloat(transaction.amount.toString()), 0);

        cash.closingDate = new Date();
        cash.totalRevenuePeso = totalRevenuePeso;
        cash.totalRevenueDollar = totalRevenueDollar;
        cash.totalExpensePeso = totalExpensePeso;
        cash.totalExpenseDollar = totalExpenseDollar;

        cash.closingBalancePeso = (parseFloat(cash.openingBalancePeso.toString()) + totalRevenuePeso) - cash.totalExpensePeso;
        cash.closingBalanceDollar = (parseFloat(cash.openingBalanceDollar.toString()) + totalRevenueDollar) - cash.totalExpenseDollar;
        console.log("cash: ", cash);
        const updateCashClose = await this.cashRepository.save(cash);
        console.log("updateCash: ", updateCashClose);
        if (updateCashClose) {
            response.success = true;
        }
        return response;

    }

    async addRevenue(record: any, userId: number) {
        console.log("record: ", record);
        var response = { success: false, error: '' }
        const cash = await this.getLastCash();
        const user = await this.userRepository.findOne({ where: { id: userId } })
        if (cash) {
            var newRevenue = new Revenue();
            newRevenue.date = new Date();
            newRevenue.concept = record.concept;
            newRevenue.currencyType = record.currencyType;
            newRevenue.user = user;
            newRevenue.cash = cash;
            newRevenue.amount = record.amount;
            console.log("newRevenue: ", newRevenue);
            const revenue = await this.revenueRepository.save(newRevenue);
            console.log("revenue: ", revenue);
            if (revenue) response.success = true;
        };
        return response;
    }

    async addExpense(record: any, userId: number) {
        var response = { success: false, error: '' }
        const cash = await this.getLastCash();
        const user = await this.userRepository.findOne({ where: { id: userId } })
        if (cash) {
            var newExpense = new Expense();
            newExpense.date = new Date();
            newExpense.concept = (record.type == 1) ? 'Retiro' : record.concept;
            newExpense.currencyType = record.currencyType;
            newExpense.type = record.type;
            newExpense.user = user;
            newExpense.cash = cash;
            newExpense.amount = record.amount;

            const expense = await this.expenseRepository.save(newExpense);
            if (expense) response.success = true;
        };
        return response;
    }

    async delete(id: number, type: number) {
        var response = { success: false, error: '' }
        if (type == 3) {
            const revenue = await this.revenueRepository.findOne(id);
            const responseDelete = await this.revenueRepository.delete(revenue);
            if(responseDelete) response.success = true;
        }else{
            const expense = await this.expenseRepository.findOne(id);
            const responseDelete = await this.expenseRepository.delete(expense);
            if(responseDelete) response.success = true;
        }

        return response;
    }
}