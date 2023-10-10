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

@Injectable()
export class CashService {
    constructor(
        @InjectRepository(Cash) private cashRepository: Repository<Cash>,
        @InjectRepository(Expense) private expenseRepository: Repository<Expense>,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(CreditTransaction) private creditTransactionRepository: Repository<CreditTransaction>,
    ) { }

    async getLastCash() {
        return this.cashRepository.findOne({ order: { id: 'DESC' } });
    }

    async openCash() {
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
        console.log("responseSaved", responseSaved);
        return responseSaved
    }

    async getTransactions(id: string) {
        const transactionsQuery: any = await this.cashRepository.createQueryBuilder('cash')
            .leftJoinAndSelect('cash.revenues', 'revenues')
            .leftJoinAndSelect('cash.expenses', 'expenses')
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
        console.log("transactionsQuery: ", transactionsQuery);
        var transactions = [];
        transactionsQuery.revenues?.map(x => {
            transactions.push(x);
        });
        transactionsQuery.expenses?.map(x => {
            transactions.push(x);
        });
        transactionsQuery.creditTransaction?.map(x => {
            transactions.push(x);
        })
        transactionsQuery.sales?.map(x => {
            transactions.push(x);
        })
        transactions.sort((a, b) => {
            if (a.date.getTime() !== b.date.getTime()) {
                return b.date.getTime() - a.date.getTime();
            }
        });
        console.log("transactionsCredits************: ", transactions);
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


    async createExpense(expense: ExpenseCreateDto) {
        const lastCash = await this.getLastCash();
        const newExpense = new Expense();
        newExpense.date = new Date();
        newExpense.user = expense.user;
        newExpense.concept = expense.concept;
        newExpense.type = expense.type;
        newExpense.currencyType = expense.currencyType;
        newExpense.amount = expense.amount;
        newExpense.cash = lastCash;
        const expenseCreate = this.expenseRepository.create(newExpense);
        const responseCreate = await this.expenseRepository.save(expenseCreate);
        console.log("response create expense: ", responseCreate);
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
        const newTransaction = this.creditTransactionRepository.create(trasactionCreate);
        const responseSaveTrasaction = await this.creditTransactionRepository.save(newTransaction);
        console.log("response guardando transacción: ", responseSaveTrasaction);
        return responseSaveTrasaction;
    }


    async addCreditTransactionDetail(creditTransaction: CreditTransaction) {
        const response = await this.creditTransactionRepository.save(creditTransaction);
        console.log("response: ", response);
    }
}