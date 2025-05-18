import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Transaction, TransactionType, Account } from '@prisma/client';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { TransactionQueryDto } from '../dto/transaction-query.dto';
import { RawTransaction } from '../interfaces';
import Decimal from 'decimal.js';

// Токен для инъекции репозитория
export const TRANSACTION_REPOSITORY = 'TRANSACTION_REPOSITORY';

// Интерфейс репозитория для работы с транзакциями
export interface ITransactionRepository {
  // Основные методы CRUD
  create(data: any): Promise<Transaction>;
  update(id: string, data: any): Promise<Transaction>;
  delete(id: string): Promise<Transaction>;
  findById(id: string, userId: string): Promise<Transaction | null>;

  // Специализированные методы поиска
  findByFilters(
    userId: string,
    where: Prisma.TransactionWhereInput,
    orderBy: Prisma.TransactionOrderByWithRelationInput[],
    pagination: { skip: number, take: number },
    includeRelations?: boolean
  ): Promise<Transaction[]>;

  // Методы для работы с транзакциями, включающие отношения
  findByIdWithRelations(id: string, userId: string): Promise<Transaction | null>;

  // Методы подсчета
  countByFilters(userId: string, where: Prisma.TransactionWhereInput): Promise<number>;

  // Методы для работы с raw SQL запросами для специальных сортировок
  findBySqlQuery(sql: Prisma.Sql): Promise<RawTransaction[]>;

  // Методы для транзакций и категорий
  validateCategoryForUser(categoryId: string, userId: string): Promise<boolean>;

  // Методы для проверки доступа пользователя к аккаунту
  validateUserAccessToAccount(accountId: string, userId: string): Promise<boolean>;

  // Методы для транзакционной обработки
  executeInTransaction<T>(
    callback: (prisma: Prisma.TransactionClient) => Promise<T>
  ): Promise<T>;

  // Методы для работы с аккаунтами
  findAccount(accountId: string, userId: string): Promise<Account | null>;
  updateAccountBalance(accountId: string, balance: Decimal | string, prisma?: any): Promise<Account>;
}

@Injectable()
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(data: any): Promise<Transaction> {
    return this.prisma.transaction.create({
      data,
      include: {
        account: true,
        category: true
      }
    });
  }

  async update(id: string, data: any): Promise<Transaction> {
    return this.prisma.transaction.update({
      where: { id },
      data,
      include: {
        account: { select: { name: true, type: true, currency: true } },
        category: { select: { name: true } },
      },
    });
  }

  async delete(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({
      where: {
        id,
        userId,
      }
    });
  }

  async findByIdWithRelations(id: string, userId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        account: { select: { name: true, type: true, currency: true } },
        category: { select: { name: true } },
      },
    });
  }

  async findByFilters(
    userId: string,
    where: Prisma.TransactionWhereInput,
    orderBy: Prisma.TransactionOrderByWithRelationInput[],
    pagination: { skip: number, take: number },
    includeRelations = false
  ): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        ...where
      },
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      include: includeRelations
        ? {
          account: { select: { name: true, type: true, currency: true, balance: true } },
          category: { select: { name: true } },
        }
        : undefined,
    });
  }

  async countByFilters(userId: string, where: Prisma.TransactionWhereInput): Promise<number> {
    return this.prisma.transaction.count({
      where: {
        userId,
        ...where
      }
    });
  }

  async findBySqlQuery(sql: Prisma.Sql): Promise<RawTransaction[]> {
    return this.prisma.$queryRaw<RawTransaction[]>(sql);
  }

  async validateCategoryForUser(categoryId: string, userId: string): Promise<boolean> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId
      }
    });

    return !!category;
  }

  async validateUserAccessToAccount(accountId: string, userId: string): Promise<boolean> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        members: {
          some: {
            userId
          }
        }
      }
    });

    return !!account;
  }

  // Метод для выполнения операций в транзакции
  async executeInTransaction<T>(
    callback: (prisma: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(callback);
  }

  // Получить аккаунт с проверкой доступа пользователя
  async findAccount(accountId: string, userId: string): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: {
        id: accountId,
        members: {
          some: {
            userId
          }
        }
      }
    });
  }

  // Обновить баланс аккаунта
  async updateAccountBalance(accountId: string, balance: Decimal | string, prisma?: any): Promise<Account> {
    const client = prisma || this.prisma;
    return client.account.update({
      where: { id: accountId },
      data: { balance }
    });
  }
}
