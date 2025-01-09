import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Prisma, Transaction } from '@prisma/client';
import { endOfDay, startOfDay, startOfWeek } from 'date-fns';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { plainToClass } from 'class-transformer';
import { AccountService } from 'src/account/account.service';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

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

}
// async getBalances(
//   userId: string,
//   startDate: Date,
//   endDate: Date,
//   interval: 'daily' | 'weekly',
// ) {
//   // Fetch all transactions in the given period
//   const transactions = await this.prisma.transaction.findMany({
//     where: {
//       userId,
//       createdAt: { gte: startOfDay(startDate), lt: endOfDay(endDate) },
//     },
//     orderBy: { createdAt: 'asc' },
//     include: { category: true, account: true },
//   });

//   // Get the initial balance before the startDate
//   const initialBalance = await this.getTotalBalanceOnDate(
//     userId,
//     new Date(startDate.getTime() - 86400000),
//   ); // Previous day

//   let currentBalance = initialBalance;
//   const balances: Array<{
//     date: string;
//     balance: number;
//     transactions: Transaction[];
//   }> = [];

//   const dateMap = new Map<
//     string,
//     { balance: number; transactions: Transaction[] }
//   >();

//   // Initialize balances based on the interval
//   // if (interval === 'daily') {
//   //   for (
//   //     let d = new Date(startDate);
//   //     d <= endDate;
//   //     d.setDate(d.getDate() + 1)
//   //   ) {
//   //     const dateStr = d.toISOString().split('T')[0];
//   //     dateMap.set(dateStr, { balance: currentBalance, transactions: [] });
//   //   }
//   // } else if (interval === 'weekly') {
//   //   for (
//   //     let d = new Date(startDate);
//   //     d <= endDate;
//   //     d.setDate(d.getDate() + 7)
//   //   ) {
//   //     const weekStart = startOfWeek(d).toISOString().split('T')[0];
//   //     dateMap.set(weekStart, { balance: currentBalance, transactions: [] });
//   //   }
//   // }

//   // Process transactions and update balances
//   for (const transaction of transactions) {
//     let dateStr: string;

//     if (interval === 'daily') {
//       dateStr = transaction.createdAt.toISOString().split('T')[0];
//     } else if (interval === 'weekly') {
//       const transactionDate = new Date(transaction.createdAt);
//       dateStr = startOfWeek(transactionDate).toISOString().split('T')[0];
//     }

//     const periodData = dateMap.get(dateStr);

//     // if (periodData) {
//     //   periodData.transactions.push(transaction);
//     //   currentBalance +=
//     //     transaction.type === 'credit'
//     //       ? -transaction.amount
//     //       : transaction.amount;
//     //   periodData.balance = currentBalance;
//     // }
//   }

//   // // Finalize balances
//   // let lastBalance = initialBalance;
//   // for (const [date, data] of dateMap) {
//   //   if (data.transactions.length === 0) data.balance = lastBalance;
//   //   lastBalance = data.balance;
//   //   balances.push({
//   //     date,
//   //     balance: data.balance,
//   //     transactions: data.transactions,
//   //   });
//   // }

//   // return balances;
// }

// async getTotalBalanceOnDate(userId: string, date: Date) {
//   const transactions = await this.prisma.transaction.findMany({
//     where: {
//       userId,
//       createdAt: { lte: date },
//     },
//     orderBy: { createdAt: 'asc' },
//   });

//   // return transactions.reduce((balance, transaction) => {
//   //   return transaction.type === 'credit'
//   //     ? balance - transaction.amount
//   //     : balance + transaction.amount;
//   // }, 0);
// }

// async getExpensesByCategory(userId: string, startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
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
// }
