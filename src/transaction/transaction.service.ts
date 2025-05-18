import { Transaction } from '@prisma/client';
import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Prisma, $Enums } from '@prisma/client';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import {
  TransactionResponseDto,
  TransactionPaginatedResponseDto,
} from './dto/transaction-response.dto';
import { mapToPaginationResponse } from '@common/utils';
import { TransactionQueryBuilder, TransactionSqlBuilder, TransactionValidator } from './helpers';
import { RawTransaction, TransactionBalanceChange } from './interfaces';
import Decimal from 'decimal.js';
import { ITransactionRepository, TRANSACTION_REPOSITORY } from './repositories';

@Injectable()
export class TransactionService {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository
  ) { }

  private readonly logger = new Logger(TransactionService.name);

  private mapToTransactionResponse(transaction: Transaction): TransactionResponseDto {
    const response = new TransactionResponseDto(transaction);

    // Если есть информация об аккаунте и его балансе, убедимся, что она корректно преобразуется
    if (response.account && 'balance' in response.account) {
      const accountBalance = response.account.balance;

      // Если баланс - это объект Decimal с внутренней структурой
      if (accountBalance && typeof accountBalance === 'object' && 'd' in accountBalance) {
        try {
          // Создаем новый объект Decimal и используем его для строкового представления
          response.account.balance = new Decimal(accountBalance).toString();
        } catch (e) {
          // Если что-то пошло не так, используем 0
          response.account.balance = '0';
        }
      }
    }

    return response;
  }

  private handleError(error: Error, defaultMessage: string): never {
    this.logger.error(`${defaultMessage}: ${error.message}`, error.stack);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Requested resource was not found');
      }

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
  ): Promise<TransactionResponseDto> {
    this.logger.log(
      `Creating transaction for user ${userId} with data: ${JSON.stringify(
        createTransactionDto,
      )}`,
    );

    try {
      // Validate the transaction data
      const validationResult = TransactionValidator.validateCreate(createTransactionDto);
      if (!validationResult.isValid) {
        throw new BadRequestException(validationResult.message);
      }

      const { type } = createTransactionDto;

      // Handle different transaction types
      switch (type) {
        case 'TRANSFER':
          return this.handleTransferTransaction(createTransactionDto, userId);
        case 'ADJUSTMENT':
          return this.handleAdjustmentTransaction(createTransactionDto, userId);
        default:
          return this.handleStandardTransaction(createTransactionDto, userId);
      }
    } catch (error) {
      this.handleError(error, 'Failed to create transaction');
    }
  }

  private async handleStandardTransaction(
    dto: CreateTransactionDto,
    userId: string
  ): Promise<TransactionResponseDto> {
    const { accountId, categoryId, type, date: dateString, description } = dto;
    const date = new Date(dateString);
    // Convert amount to Decimal if it's a string
    const amount = typeof dto.amount === 'string' ? new Decimal(dto.amount) : dto.amount;

    return this.transactionRepository.executeInTransaction(async (prisma) => {
      // Validate category
      const isCategoryValid = await this.transactionRepository.validateCategoryForUser(categoryId, userId);
      if (!isCategoryValid) {
        throw new NotFoundException(`Category ${categoryId} not found or you don't have access to it`);
      }

      // Validate account
      const account = await this.transactionRepository.findAccount(accountId, userId);

      // Validate accounts for this transaction
      const accountValidation = TransactionValidator.validateAccountsForTransaction(
        type,
        account,
        null
      );

      if (!accountValidation.isValid) {
        throw new BadRequestException(accountValidation.message);
      }

      // Calculate balance changes
      const balanceChanges = TransactionValidator.calculateBalanceChanges(
        type,
        amount,
        accountId
      );

      // Create transaction
      const transaction = await this.transactionRepository.create({
        description,
        amount,
        type,
        date,
        user: { connect: { id: userId } },
        category: { connect: { id: categoryId } },
        account: { connect: { id: accountId } },
      });

      // Update account balance if this is not an adjustment
      if (type !== 'ADJUSTMENT') {
        const change = balanceChanges[0].change;
        const newBalance = account.balance.add(change);

        await this.transactionRepository.updateAccountBalance(accountId, newBalance, prisma);
      }

      this.logger.debug(
        `Transaction created: ${JSON.stringify(transaction)}`,
      );

      return this.mapToTransactionResponse(transaction);
    });
  }

  private async handleAdjustmentTransaction(
    dto: CreateTransactionDto,
    userId: string
  ): Promise<TransactionResponseDto> {
    // Convert amount to Decimal if it's a string
    const amount = typeof dto.amount === 'string' ? new Decimal(dto.amount) : dto.amount;

    return this.transactionRepository.executeInTransaction(async (prisma) => {
      // Validate account
      const account = await this.transactionRepository.findAccount(dto.accountId, userId);
      if (!account) {
        throw new NotFoundException('Account not found or you don\'t have access to it');
      }

      // Validate category
      const isCategoryValid = await this.transactionRepository.validateCategoryForUser(dto.categoryId, userId);
      if (!isCategoryValid) {
        throw new NotFoundException('Category not found');
      }

      // Create transaction
      const transaction = await this.transactionRepository.create({
        type: 'ADJUSTMENT',
        amount,
        user: { connect: { id: userId } },
        account: { connect: { id: dto.accountId } },
        description: dto.description || 'Balance adjustment',
        date: new Date(dto.date),
        category: { connect: { id: dto.categoryId } },
      });

      // Update account balance
      await this.transactionRepository.updateAccountBalance(dto.accountId, amount, prisma);

      return this.mapToTransactionResponse(transaction);
    });
  }

  private async handleTransferTransaction(
    dto: CreateTransactionDto,
    userId: string
  ): Promise<TransactionResponseDto> {
    if (!dto.fromAccountId || !dto.toAccountId) {
      throw new BadRequestException('Transfer requires fromAccountId and toAccountId');
    }

    // Convert amount to Decimal if it's a string
    const amount = typeof dto.amount === 'string' ? new Decimal(dto.amount) : dto.amount;

    return this.transactionRepository.executeInTransaction(async (prisma) => {
      // Fetch source and destination accounts
      const fromAccount = await this.transactionRepository.findAccount(dto.fromAccountId, userId);
      const toAccount = await this.transactionRepository.findAccount(dto.toAccountId, userId);

      // Validate accounts for this transaction
      const accountValidation = TransactionValidator.validateAccountsForTransaction(
        'TRANSFER',
        fromAccount,
        toAccount
      );

      if (!accountValidation.isValid) {
        throw new BadRequestException(accountValidation.message);
      }

      // Validate category
      const isCategoryValid = await this.transactionRepository.validateCategoryForUser(dto.categoryId, userId);
      if (!isCategoryValid) {
        throw new NotFoundException('Category not found');
      }

      // Calculate new balances
      const sourceNewBalance = fromAccount.balance.sub(amount);
      const destNewBalance = toAccount.balance.add(amount);

      // Create outgoing transaction
      const sourceTransaction = await this.transactionRepository.create({
        type: 'CREDIT', // Outgoing from source account
        amount,
        user: { connect: { id: userId } },
        account: { connect: { id: dto.fromAccountId } },
        description: `Transfer to ${toAccount.name}`,
        date: new Date(dto.date),
        category: { connect: { id: dto.categoryId } },
      });

      // Create incoming transaction
      await this.transactionRepository.create({
        type: 'DEBIT', // Incoming to destination account
        amount,
        user: { connect: { id: userId } },
        account: { connect: { id: dto.toAccountId } },
        description: `Transfer from ${fromAccount.name}`,
        date: new Date(dto.date),
        category: { connect: { id: dto.categoryId } },
      });

      // Update account balances
      await Promise.all([
        this.transactionRepository.updateAccountBalance(dto.fromAccountId, sourceNewBalance, prisma),
        this.transactionRepository.updateAccountBalance(dto.toAccountId, destNewBalance, prisma)
      ]);

      return this.mapToTransactionResponse(sourceTransaction);
    });
  }

  async findAll(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<TransactionPaginatedResponseDto> {
    try {
      this.logger.log(`Fetching transactions for user ${userId} with query ${JSON.stringify(query)}`);

      const isAmountSort = query.sortBy === 'amount';
      const transactions = await this.fetchTransactions(userId, query, isAmountSort);
      const total = await this.fetchTotalCount(userId, query);

      return mapToPaginationResponse(
        transactions,
        total,
        query.page || 1,
        query.limit || 10
      );
    } catch (error) {
      this.handleError(error, 'Failed to fetch transactions');
    }
  }

  private async fetchTransactions(
    userId: string,
    query: TransactionQueryDto,
    isAmountSort: boolean,
  ): Promise<TransactionResponseDto[]> {
    if (isAmountSort) {
      // Use raw SQL for amount sorting to handle different transaction types
      const sql = TransactionSqlBuilder.buildAmountSortQuery(userId, query);
      const rawData = await this.transactionRepository.findBySqlQuery(sql);
      return TransactionSqlBuilder.mapRawTransactions(rawData);
    }

    // Use query builder for other sorts
    const config = TransactionQueryBuilder.buildQueryConfig(userId, query);
    const transactions = await this.transactionRepository.findByFilters(
      userId,
      config.where,
      config.orderBy,
      {
        skip: (config.page - 1) * config.limit,
        take: config.limit
      },
      config.includeRelations
    );

    return transactions.map((t) => this.mapToTransactionResponse(t));
  }

  private async fetchTotalCount(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<number> {
    const where = TransactionQueryBuilder.buildWhereClause(userId, query);
    return this.transactionRepository.countByFilters(userId, where);
  }

  async findOne(id: string, userId: string): Promise<TransactionResponseDto> {
    try {
      const transaction = await this.transactionRepository.findByIdWithRelations(id, userId);

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
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
  ): Promise<TransactionResponseDto> {
    try {
      // Validate the update data
      const validationResult = TransactionValidator.validateUpdate(updateDto);
      if (!validationResult.isValid) {
        throw new BadRequestException(validationResult.message);
      }

      // Find existing transaction
      const existingTransaction = await this.transactionRepository.findById(id, userId);

      if (!existingTransaction) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      // If transaction type is changing, we need special handling
      if (updateDto.type && updateDto.type !== existingTransaction.type) {
        throw new BadRequestException('Changing transaction type is not supported. Delete and create a new transaction instead.');
      }

      // Convert amount to Decimal if needed
      let newAmount: Decimal | undefined;
      if (updateDto.amount) {
        newAmount = typeof updateDto.amount === 'string' ? new Decimal(updateDto.amount) : updateDto.amount;
      }

      return await this.transactionRepository.executeInTransaction(async (prisma) => {
        // Get account information needed for balance updates
        let accountBalanceUpdates = [];
        const account = await this.transactionRepository.findAccount(existingTransaction.accountId, userId);

        // Handle account change
        if (updateDto.accountId && updateDto.accountId !== existingTransaction.accountId) {
          // Check if user has access to the new account
          const newAccount = await this.transactionRepository.findAccount(updateDto.accountId, userId);

          if (!newAccount) {
            throw new NotFoundException(`Account ${updateDto.accountId} not found or you don't have access to it`);
          }

          // Prepare balance updates
          accountBalanceUpdates = [
            // Revert original transaction effect on original account
            {
              id: existingTransaction.accountId,
              balance: this.calculateBalanceReversion(
                existingTransaction.type,
                existingTransaction.amount,
                account.balance
              )
            },
            // Apply transaction effect to new account
            {
              id: newAccount.id,
              balance: this.calculateBalanceChange(
                existingTransaction.type,
                newAmount || existingTransaction.amount,
                newAccount.balance
              )
            }
          ];
        }
        // Handle amount change on same account
        else if (newAmount && !newAmount.equals(existingTransaction.amount)) {
          // Revert old amount effect
          const revertedBalance = this.calculateBalanceReversion(
            existingTransaction.type,
            existingTransaction.amount,
            account.balance
          );

          // Apply new amount effect
          const newBalance = this.calculateBalanceChange(
            existingTransaction.type,
            newAmount,
            revertedBalance
          );

          accountBalanceUpdates = [{
            id: account.id,
            balance: newBalance
          }];
        }

        // Check if category needs validation
        if (updateDto.categoryId) {
          const isCategoryValid = await this.transactionRepository.validateCategoryForUser(updateDto.categoryId, userId);

          if (!isCategoryValid) {
            throw new NotFoundException(`Category ${updateDto.categoryId} not found`);
          }
        }

        // Update transaction
        const updatedTransaction = await this.transactionRepository.update(id, {
          amount: newAmount,
          type: updateDto.type,
          description: updateDto.description,
          accountId: updateDto.accountId,
          categoryId: updateDto.categoryId,
          date: updateDto.date ? new Date(updateDto.date) : undefined,
        });

        // Update account balances if necessary
        for (const update of accountBalanceUpdates) {
          await this.transactionRepository.updateAccountBalance(update.id, update.balance, prisma);
        }

        return this.mapToTransactionResponse(updatedTransaction);
      });
    } catch (error) {
      this.handleError(error, `Failed to update transaction ${id}`);
    }
  }

  private calculateBalanceReversion(
    type: $Enums.TransactionType,
    amount: Decimal,
    currentBalance: Decimal | string | number
  ): Decimal {
    // Ensure currentBalance is a Decimal object
    const balance = new Decimal(currentBalance.toString());

    // Reverse the effect of the original transaction
    switch (type) {
      case 'CREDIT':
        return balance.add(amount); // CREDIT decreased balance, so add it back
      case 'DEBIT':
        return balance.sub(amount); // DEBIT increased balance, so subtract it
      case 'ADJUSTMENT':
        return balance; // ADJUSTMENT directly set the balance, no simple reversion
      default:
        return balance;
    }
  }

  private calculateBalanceChange(
    type: $Enums.TransactionType,
    amount: Decimal,
    currentBalance: Decimal | string | number
  ): Decimal {
    // Ensure currentBalance is a Decimal object
    const balance = new Decimal(currentBalance.toString());

    // Apply the effect of the transaction
    switch (type) {
      case 'CREDIT':
        return balance.sub(amount); // CREDIT decreases balance
      case 'DEBIT':
        return balance.add(amount); // DEBIT increases balance
      case 'ADJUSTMENT':
        return amount; // ADJUSTMENT directly sets the balance
      default:
        return balance;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      return await this.transactionRepository.executeInTransaction(async (prisma) => {
        // Find the transaction with account info for balance update
        const transaction = await this.transactionRepository.findById(id, userId);

        if (!transaction) {
          throw new NotFoundException(`Transaction with ID ${id} not found`);
        }

        // Get account for balance update
        const account = await this.transactionRepository.findAccount(transaction.accountId, userId);

        // Delete the transaction
        await this.transactionRepository.delete(id);

        // Update account balance (reverse the effect)
        if (transaction.type !== 'ADJUSTMENT') {
          const newBalance = this.calculateBalanceReversion(
            transaction.type,
            transaction.amount,
            account.balance
          );

          await this.transactionRepository.updateAccountBalance(transaction.accountId, newBalance, prisma);
        }

        this.logger.log(`Transaction ${id} deleted successfully`);
      });
    } catch (error) {
      this.handleError(error, `Failed to delete transaction ${id}`);
    }
  }
}
