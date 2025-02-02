import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Prisma, Transaction } from '@prisma/client';
import { addDays, addWeeks, startOfWeek, subDays } from 'date-fns';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { plainToClass } from 'class-transformer';
import { AccountService } from 'src/account/account.service';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { endOfDay, startOfDay } from '@common/helpers';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService, private readonly accountService: AccountService) { }

  private readonly logger = new Logger(TransactionService.name)

  private mapToTransactionResponse(transaction: Transaction): TransactionResponseDto {
    return plainToClass(TransactionResponseDto, transaction);
  }

  private validateTransactionType(type: string): void {
    const validTypes = ['CREDIT', 'DEBIT'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException(`Invalid transaction type: ${type}. Valid types are: ${validTypes.join(', ')}`);
    }
  }

  public async create(createTransactionDto: CreateTransactionDto, userId: string): Promise<TransactionResponseDto> {
    this.logger.log('Creating transcation for user ' + userId + ' with data: ' + JSON.stringify(createTransactionDto));
    try {

      const { date, categoryId, accountId, amount, type, description } = createTransactionDto;

      this.validateTransactionType(type);

      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category)
        throw new NotFoundException(`Category with ID ${categoryId} not found`);

      // Validate account existence
      const account = await this.accountService.getAccountById(accountId, userId);
      if (!account)
        throw new NotFoundException(`Account with ID ${accountId} not found`);

      // Update account balance based on transaction type
      const balanceChange = type === 'CREDIT' ? -amount : amount;
      const newBalance = account.balance + balanceChange;

      // Update account balance
      const updatedAccount = await this.accountService.update(
        accountId,
        { ...account, balance: newBalance },
        userId
      );

      // Create transaction
      const transaction = await this.prisma.transaction.create({
        data: {
          description,
          amount,
          type,
          date,
          balanceAfterTransaction: updatedAccount.balance,
          user: { connect: { id: userId } },
          category: { connect: { id: categoryId } },
          account: { connect: { id: accountId } },
        },
      });

      this.logger.log('Transaction created successfully: ' + JSON.stringify(transaction));

      return this.mapToTransactionResponse(transaction);
    } catch (error) {
      this.logger.error('Failed to create transaction: ' + error.message);
      throw new HttpException(
        error.message || 'Failed to create transaction',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  public async findAll(userId: string): Promise<TransactionResponseDto[]> {
    this.logger.log('Finding all transactions for user ' + userId);
    try {
      const transactions = await this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
      });
      this.logger.log('Found ' + transactions.length + ' transactions for user ' + userId);
      return transactions.map((transaction) => this.mapToTransactionResponse(transaction));
    } catch (error) {
      this.logger.error('Failed to find all transactions: ' + error.message);
      throw new HttpException(
        error.message || 'Failed to find all transactions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async findOne(id: string, userId: string): Promise<TransactionResponseDto> {
    this.logger.log('Finding transaction with ID ' + id + ' for user ' + userId);
    try {
      const transaction = await this.prisma.transaction.findFirst({
        where: { id, userId },
      });
      if (!transaction)
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      this.logger.log('Found transaction with ID ' + id + ' for user ' + userId);
      return this.mapToTransactionResponse(transaction);
    } catch (error) {
      this.logger.error('Failed to find transaction with ID ' + id + ': ' + error.message);
      throw new HttpException(
        error.message || 'Failed to find transaction with ID ' + id,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async update(id: string, updateTransactionDto: UpdateTransactionDto, userId: string): Promise<TransactionResponseDto> {
    this.logger.log(' Updating transaction with ID ' + id + ' for user ' + userId);

    try {
      this.validateTransactionType(updateTransactionDto.type);
      const transaction = await this.prisma.transaction.update({
        where: { id, userId },
        data: updateTransactionDto,
      });
      this.logger.log('Transaction updated successfully: ' + JSON.stringify(transaction));
      return this.mapToTransactionResponse(transaction);
    } catch (error) {
      this.logger.error('Failed to update transaction with ID ' + id + ': ' + error.message);
      throw new HttpException(
        error.message || 'Failed to update transaction with ID ' + id,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async delete(id: string, userId: string): Promise<void> {
    this.logger.log('Deleting transaction with ID ' + id + ' for user ' + userId);
    try {
      const transaction = await this.prisma.transaction.delete({
        where: { id, userId },
      });
      this.logger.log('Transaction deleted successfully: ' + JSON.stringify(transaction));
    } catch (error) {
      this.logger.error('Failed to delete transaction with ID ' + id + ': ' + error.message);
      throw new HttpException(
        error.message || 'Failed to delete transaction with ID ' + id,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }


  public async getDailyBalanceWithTransactions(
    userId: string,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly',
  ) {
    // Validate input dates
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    if (start > end) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Fetch transactions within date range
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
      include: { category: true, account: true },
    });

    // Get initial balance
    const initialBalance = await this.getTotalBalanceOnDate(
      userId,
      subDays(start, 1)
    );

    const dateMap = this.initializeDateMap(start, end, interval, initialBalance);

    // Process transactions
    let currentBalance = initialBalance;
    for (const transaction of transactions) {
      const periodKey = this.getPeriodKey(transaction.date, interval);
      const periodData = dateMap.get(periodKey);

      if (periodData) {
        periodData.transactions.push(transaction);
        currentBalance += this.getTransactionImpact(transaction);
        periodData.balance = currentBalance;
      }
    }

    // Finalize balances
    return this.finalizeBalances(dateMap, interval);
  }

  private getTransactionImpact(transaction: Transaction): number {
    return transaction.type === 'CREDIT'
      ? -transaction.amount
      : transaction.amount;
  }

  private initializeDateMap(
    start: Date,
    end: Date,
    interval: 'daily' | 'weekly',
    initialBalance: number
  ): Map<string, { balance: number; transactions: Transaction[] }> {
    const dateMap = new Map();

    if (interval === 'daily') {
      let currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = this.getPeriodKey(currentDate, 'daily');
        dateMap.set(dateKey, {
          balance: initialBalance,
          transactions: []
        });
        currentDate = addDays(currentDate, 1);
      }
    } else {
      const firstWeekStart = startOfWeek(start);
      const lastWeekStart = startOfWeek(end);
      let currentWeek = firstWeekStart;

      while (currentWeek <= lastWeekStart) {
        const weekKey = this.getPeriodKey(currentWeek, 'weekly');
        dateMap.set(weekKey, {
          balance: initialBalance,
          transactions: []
        });
        currentWeek = addWeeks(currentWeek, 1);
      }
    }

    return dateMap;
  }

  private getPeriodKey(date: Date, interval: 'daily' | 'weekly'): string {
    const targetDate = new Date(date);
    return interval === 'daily'
      ? targetDate.toISOString().split('T')[0]
      : startOfWeek(targetDate).toISOString().split('T')[0];
  }

  private finalizeBalances(
    dateMap: Map<string, { balance: number; transactions: Transaction[] }>,
    interval: 'daily' | 'weekly'
  ) {
    const sortedKeys = Array.from(dateMap.keys()).sort();
    const result: Array<{
      date: string;
      balance: number;
      transactions: Transaction[];
    }> = [];

    let lastBalance = dateMap.get(sortedKeys[0])?.balance || 0;

    for (const key of sortedKeys) {
      const periodData = dateMap.get(key);
      if (!periodData) continue;

      // Carry forward balance for periods with no transactions
      if (periodData.transactions.length === 0) {
        periodData.balance = lastBalance;
      }

      result.push({
        date: key,
        balance: periodData.balance,
        transactions: periodData.transactions,
      });

      lastBalance = periodData.balance;
    }

    return result;
  }

  private async getTotalBalanceOnDate(userId: string, date: Date) {
    const [creditResult, debitResult] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          date: { lt: date },
          type: 'CREDIT',
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          date: { lt: date },
          type: 'DEBIT',
        },
        _sum: { amount: true },
      }),
    ]);

    return (debitResult._sum.amount || 0) - (creditResult._sum.amount || 0);
  }


  // async getExpensesByCategory(userId: string, start?: Date, end?: Date): Promise<Record<string, number>> {
  //   const where: Prisma.TransactionWhereInput = {
  //     userId,
  //     // type: 'credit',
  //   };

  //   if (startDate) {
  //     where.createdAt = { gte: startOfDay(startDate) };
  //   }
  //   if (endDate) {
  //     where.createdAt = { lte: endOfDay(endDate) };
  //   }

  //   const transactions = await this.prisma.transaction.findMany({
  //     where,
  //     include: { category: true },
  //   });

  //   const expensesByCategory = transactions.reduce((acc, transaction) => {
  //     const categoryName = transaction.category?.name || 'Uncategorized'; // Handle missing categories
  //     acc[categoryName] = (acc[categoryName] || 0) + transaction.amount;
  //     return acc;
  //   }, {} as Record<string, number>);

  //   return expensesByCategory;
  // }
}
