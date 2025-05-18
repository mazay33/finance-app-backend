import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Account, AccountMember, AccountRole, AccountType, Prisma } from '@prisma/client';

// Токен для инъекции репозитория
export const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';

// Интерфейс репозитория для работы с аккаунтами
export interface IAccountRepository {
  findById(id: string): Promise<Account | null>;
  findByIdWithMember(id: string, userId: string): Promise<{ account: Account, member: AccountMember | null }>;
  create(data: Prisma.AccountCreateInput): Promise<Account>;
  update(id: string, data: Prisma.AccountUpdateInput): Promise<Account>;
  delete(id: string): Promise<Account>;
  findByUserIdWithFilters(
    userId: string,
    filters: Prisma.AccountWhereInput,
    pagination: { skip: number, take: number },
    orderBy?: Prisma.AccountOrderByWithRelationInput[]
  ): Promise<[Account[], number]>;
  findUniqueByUserAttributes(
    name: string,
    currency: string,
    type: AccountType,
    userId: string
  ): Promise<Account | null>;
  createAccountMember(accountId: string, userId: string, role: AccountRole): Promise<AccountMember>;
}

@Injectable()
export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { id }
    });
  }

  async findByIdWithMember(id: string, userId: string): Promise<{ account: Account, member: AccountMember | null }> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      return { account: null, member: null };
    }

    const member = await this.prisma.accountMember.findFirst({
      where: {
        accountId: id,
        userId,
      }
    });

    return { account, member };
  }

  async create(data: Prisma.AccountCreateInput): Promise<Account> {
    return this.prisma.account.create({ data });
  }

  async update(id: string, data: Prisma.AccountUpdateInput): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Account> {
    return this.prisma.account.delete({
      where: { id },
    });
  }

  async findByUserIdWithFilters(
    userId: string,
    filters: Prisma.AccountWhereInput,
    pagination: { skip: number, take: number },
    orderBy?: Prisma.AccountOrderByWithRelationInput[]
  ): Promise<[Account[], number]> {
    const where: Prisma.AccountWhereInput = {
      members: {
        some: {
          userId,
        },
      },
      ...filters
    };

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.account.count({ where }),
    ]);

    return [accounts, total];
  }

  async findUniqueByUserAttributes(
    name: string,
    currency: string,
    type: AccountType,
    userId: string
  ): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: {
        name,
        currency,
        type,
        members: {
          some: {
            userId,
          },
        },
      },
    });
  }

  async createAccountMember(accountId: string, userId: string, role: AccountRole): Promise<AccountMember> {
    return this.prisma.accountMember.create({
      data: {
        accountId,
        userId,
        role,
      },
    });
  }
}
