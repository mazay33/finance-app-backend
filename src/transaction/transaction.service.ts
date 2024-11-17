import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Prisma, Transaction } from '@prisma/client';
import { endOfDay, startOfDay, startOfWeek } from 'date-fns';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createTransactionDto: CreateTransactionDto) {
    const { date,categoryId, accountId, amount, type, ...transactionData } =
      createTransactionDto;

    // Validate account existence
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account)
      throw new NotFoundException(`Account with ID ${accountId} not found`);

    // Update account balance based on transaction type
    const balanceChange = type === 'credit' ? -amount : amount;
    const updatedAccount = await this.prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: balanceChange } },
    });

    // Create and return the new transaction
    return this.prisma.transaction.create({
      data: {
        ...transactionData,
        amount,
        type,
        balanceAfterTransaction: updatedAccount.balance,
        user: { connect: { id: userId } },
        category: { connect: { id: categoryId } },
        account: { connect: { id: accountId } },
        createdAt: new Date(date)
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      include: { category: true, account: true }, // Include category
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(userId: string, id: number){
    return this.prisma.transaction.delete({
      where: {userId, id}
    })
  }


  async getBalances(
    userId: string,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly',
  ): Promise<
    Array<{ date: string; balance: number; transactions: Transaction[] }>
  > {
    // Fetch all transactions in the given period
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: startOfDay(startDate), lt: endOfDay(endDate) },
      },
      orderBy: { createdAt: 'asc' },
      include: { category: true, account: true },
    });

    // Get the initial balance before the startDate
    const initialBalance = await this.getTotalBalanceOnDate(
      userId,
      new Date(startDate.getTime() - 86400000),
    ); // Previous day

    let currentBalance = initialBalance;
    const balances: Array<{
      date: string;
      balance: number;
      transactions: Transaction[];
    }> = [];

    const dateMap = new Map<
      string,
      { balance: number; transactions: Transaction[] }
    >();

    // Initialize balances based on the interval
    if (interval === 'daily') {
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split('T')[0];
        dateMap.set(dateStr, { balance: currentBalance, transactions: [] });
      }
    } else if (interval === 'weekly') {
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 7)
      ) {
        const weekStart = startOfWeek(d).toISOString().split('T')[0];
        dateMap.set(weekStart, { balance: currentBalance, transactions: [] });
      }
    }

    // Process transactions and update balances
    for (const transaction of transactions) {
      let dateStr: string;

      if (interval === 'daily') {
        dateStr = transaction.createdAt.toISOString().split('T')[0];
      } else if (interval === 'weekly') {
        const transactionDate = new Date(transaction.createdAt);
        dateStr = startOfWeek(transactionDate).toISOString().split('T')[0];
      }

      const periodData = dateMap.get(dateStr);

      if (periodData) {
        periodData.transactions.push(transaction);
        currentBalance +=
          transaction.type === 'credit'
            ? -transaction.amount
            : transaction.amount;
        periodData.balance = currentBalance;
      }
    }

    // Finalize balances
    let lastBalance = initialBalance;
    for (const [date, data] of dateMap) {
      if (data.transactions.length === 0) data.balance = lastBalance;
      lastBalance = data.balance;
      balances.push({
        date,
        balance: data.balance,
        transactions: data.transactions,
      });
    }

    return balances;
  }

  async getTotalBalanceOnDate(userId: string, date: Date): Promise<number> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { lte: date },
      },
      orderBy: { createdAt: 'asc' },
    });

    return transactions.reduce((balance, transaction) => {
      return transaction.type === 'credit'
        ? balance - transaction.amount
        : balance + transaction.amount;
    }, 0);
  }

  async getExpensesByCategory(userId: string, startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type: 'credit',
    };

    if (startDate) {
      where.createdAt = { gte: startOfDay(startDate) };
    }
    if (endDate) {
      where.createdAt = { lte: endOfDay(endDate) };
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
    });

    const expensesByCategory = transactions.reduce((acc, transaction) => {
      const categoryName = transaction.category?.name || 'Uncategorized'; // Handle missing categories
      acc[categoryName] = (acc[categoryName] || 0) + transaction.amount;
      return acc;
    }, {} as Record<string, number>);

    return expensesByCategory;
  }
}
