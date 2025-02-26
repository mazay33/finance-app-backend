import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Prisma, Transaction } from '@prisma/client';
import { plainToClass } from 'class-transformer';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import {
  TransactionDto,
  TransactionResponseDto,
} from './dto/transaction-response.dto';
import { mapToPaginationResponse } from '@common/utils';

@Injectable()
export class TransactionService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  private readonly logger = new Logger(TransactionService.name);

  private mapToTransactionResponse(transaction: Transaction): TransactionDto {
    return plainToClass(TransactionDto, transaction);
  }

  private validateTransactionType(type: string): void {
    if (!['CREDIT', 'DEBIT'].includes(type)) {
      throw new BadRequestException(
        `Invalid transaction type: ${type}. Valid types are CREDIT, DEBIT`,
      );
    }
  }


  private handleError(error: Error, defaultMessage: string): never {
    this.logger.error(`${defaultMessage}: ${error.message}`, error.stack);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new BadRequestException('Database operation failed');
    }

    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(defaultMessage);
  }

  async create(
    createTransactionDto: CreateTransactionDto,
    userId: string,
  ): Promise<TransactionDto> {
    this.logger.log(
      `Creating transaction for user ${userId} with data: ${JSON.stringify(
        createTransactionDto,
      )}`,
    );

    try {
      const { accountId, categoryId, amount, type, date: dateString, description } = createTransactionDto;

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date format');
      }


      if (date > new Date()) {
        throw new BadRequestException('Transaction date cannot be in the future');
      }

      return await this.prisma.$transaction(async (prisma) => {
        // Validate category
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          throw new NotFoundException(`Category ${categoryId} not found`);
        }

        // Validate transaction type
        this.validateTransactionType(type);

        // Lock and validate account
        const account = await prisma.account.findUnique({
          where: { id: accountId, userId },
        });
        if (!account) {
          throw new NotFoundException(`Account ${accountId} not found`);
        }

        // Calculate new balance
        const balanceChange = type === 'CREDIT' ? -amount : amount;
        const newBalance = Number(account.balance) + balanceChange;

        // Create transaction
        const transaction = await this.prisma.transaction.create({
          data: {
            description,
            amount,
            type,
            date,
            user: { connect: { id: userId } },
            category: { connect: { id: categoryId } },
            account: { connect: { id: accountId } },
          },
        });


        // Update account balance
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: newBalance },
        });

        this.logger.debug(
          `Transaction created: ${JSON.stringify(transaction)}`,
        );

        return this.mapToTransactionResponse(transaction);
      });
    } catch (error) {
      this.handleError(error, 'Failed to create transaction');
    }
  }

  async findAll(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<TransactionResponseDto> {
    this.logger.log(`Fetching transactions for user ${userId}`);

    try {
      const where: Prisma.TransactionWhereInput = { userId };
      const { search, type, page = 1, limit = 10, sortBy, order } = query;

      if (search) {
        where.description = { contains: search, mode: 'insensitive' };
      }

      if (type) {
        where.type = type;
      }

      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          orderBy: sortBy ? { [sortBy]: order || 'desc' } : undefined,
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.transaction.count({ where }),
      ]);

      this.logger.debug(`Found ${transactions.length} transactions`);

      return mapToPaginationResponse(
        transactions.map(this.mapToTransactionResponse),
        total,
        page,
        limit,
      );
    } catch (error) {
      this.handleError(error, 'Failed to fetch transactions');
    }
  }

  async findOne(id: string, userId: string): Promise<TransactionDto> {
    this.logger.log(`Fetching transaction ${id} for user ${userId}`);

    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id, userId },
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction ${id} not found`);
      }

      return this.mapToTransactionResponse(transaction);
    } catch (error) {
      this.handleError(error, `Failed to fetch transaction ${id}`);
    }
  }

  async update(
    id: string,
    updateDto: UpdateTransactionDto,
    userId: string,
  ): Promise<TransactionDto> {
    this.logger.log(`Updating transaction ${id} for user ${userId}`);

    const { accountId: newAccountId, categoryId, amount: newAmount, type: newType, date: dateString, description } = updateDto;

    const date = dateString ? new Date(dateString) : undefined;

    if (dateString) {
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      if (date > new Date()) {
        throw new BadRequestException('Transaction date cannot be in the future');
      }

    }

    try {
      return await this.prisma.$transaction(async (prisma) => {
        this.logger.debug(`Starting transaction for update ${id}`);

        // Получаем существующую транзакцию с текущим аккаунтом
        const existing = await prisma.transaction.findUnique({
          where: { id, userId },
          include: { account: true, category: true },
        });

        if (!existing) {
          throw new NotFoundException(`Transaction ${id} not found`);
        }

        // Проверяем, изменились ли поля, влияющие на баланс
        const isAccountChanged = newAccountId && newAccountId !== existing.accountId;

        let oldAccount = existing.account;
        let newAccount = oldAccount;

        // Если изменился аккаунт, проверяем новый
        if (isAccountChanged) {
          this.logger.debug(`Account changed from ${oldAccount.id} to ${newAccountId}`);
          newAccount = await prisma.account.findUnique({
            where: { id: newAccountId, userId },
          });
          if (!newAccount) {
            throw new NotFoundException(`Account ${newAccountId} not found`);
          }
        }

        // Проверяем категорию, если изменилась
        if (categoryId && categoryId !== existing.categoryId) {
          const category = await prisma.category.findUnique({ where: { id: categoryId } });
          if (!category) {
            throw new NotFoundException(`Category ${categoryId} not found`);
          }
        }

        // Валидируем тип, если изменился
        if (newType) {
          this.validateTransactionType(newType);
        }

        // Рассчитываем изменения баланса
        const oldImpact = existing.type === 'CREDIT' ? -existing.amount : existing.amount;
        const newTypeValue = newType || existing.type;
        const newAmountValue = newAmount !== undefined ? newAmount : existing.amount;
        const newImpact = newTypeValue === 'CREDIT' ? -newAmountValue : newAmountValue;

        const impactDifference = newImpact - oldImpact;

        // Обновляем балансы аккаунтов, если есть изменения
        if (impactDifference !== 0 || isAccountChanged) {
          // Если аккаунт изменился, корректируем старый и новый
          if (isAccountChanged) {
            // Возвращаем старый аккаунт к предыдущему балансу
            await prisma.account.update({
              where: { id: oldAccount.id },
              data: { balance: oldAccount.balance - oldImpact },
            });

            // Применяем новый impact к новому аккаунту
            await prisma.account.update({
              where: { id: newAccount.id },
              data: { balance: newAccount.balance + newImpact },
            });

            this.logger.debug(`Adjusted balances for old account ${oldAccount.id} and new account ${newAccount.id}`);
          } else {
            // Обновляем текущий аккаунт
            await prisma.account.update({
              where: { id: oldAccount.id },
              data: { balance: oldAccount.balance + impactDifference },
            });
            this.logger.debug(`Adjusted balance for account ${oldAccount.id} by ${impactDifference}`);
          }
        }

        // Обновляем саму транзакцию
        const updatedTransaction = await prisma.transaction.update({
          where: { id },
          data: {
            description,
            amount: newAmountValue,
            type: newTypeValue,
            date,
            categoryId: categoryId || existing.categoryId,
            accountId: newAccountId || existing.accountId,
          },
        });

        this.logger.debug(`Transaction ${id} updated successfully`);

        return this.mapToTransactionResponse(updatedTransaction);
      });
    } catch (error) {
      this.handleError(error, `Failed to update transaction ${id}`);
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting transaction ${id} for user ${userId}`);

    try {
      await this.prisma.$transaction(async (prisma) => {
        const transaction = await prisma.transaction.findUnique({
          where: { id, userId },
          include: { account: true },
        });

        if (!transaction) {
          throw new NotFoundException(`Transaction ${id} not found`);
        }

        // Calculate balance impact (reverse original transaction effect)
        const impact =
          transaction.type === 'CREDIT'
            ? transaction.amount // Revert CREDIT: add back to balance
            : -transaction.amount; // Revert DEBIT: subtract from balance

        // Restore account balance
        await prisma.account.update({
          where: { id: transaction.accountId },
          data: { balance: transaction.account.balance + impact },
        });

        // Delete transaction
        await prisma.transaction.delete({ where: { id } });

        this.logger.debug(`Transaction ${id} deleted successfully`);
      });
    } catch (error) {
      this.handleError(error, `Failed to delete transaction ${id}`);
    }
  }
}
