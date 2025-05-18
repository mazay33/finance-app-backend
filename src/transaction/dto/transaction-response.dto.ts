import { Currency } from "@common/enums";
import { Pagination } from "@common/types";
import { ApiProperty } from "@nestjs/swagger";
import { Account, AccountType, Category, Transaction, TransactionType } from "@prisma/client";
import { Exclude, Transform, Type } from "class-transformer";
import Decimal from "decimal.js";

export class TransactionPaginatedResponseDto {
  data: TransactionResponseDto[];
  pagination: Pagination;
}

class TransactionAccountInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: AccountType;

  @ApiProperty()
  currency: Currency;

  @ApiProperty()
  @Transform(({ value }) => {
    // Если баланс - это объект Decimal, преобразуем его в строку
    if (value instanceof Decimal) {
      return value.toString();
    }
    // Если баланс уже имеет внутреннюю структуру Decimal, создаем объект и преобразуем
    if (value && typeof value === 'object' && 'd' in value) {
      try {
        return new Decimal(value).toString();
      } catch (e) {
        return '0';
      }
    }
    // Во всех других случаях возвращаем строковое представление
    return value?.toString() || '0';
  })
  balance: Decimal | any;

  @ApiProperty()
  description: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value && typeof value === 'object' && Object.keys(value).length === 0) {
      return new Date().toISOString();
    }
    return value;
  })
  createdAt: Date;

  @ApiProperty()
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value && typeof value === 'object' && Object.keys(value).length === 0) {
      return new Date().toISOString();
    }
    return value;
  })
  updatedAt: Date;
}

class TransactionCategoryInfoDto implements Pick<Category, 'name'> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  color: string;
}

export class TransactionResponseDto implements Transaction {
  @ApiProperty()
  id: string;

  @ApiProperty()
  @Transform(({ value }) => value.toString())
  amount: Decimal;

  @ApiProperty()
  type: TransactionType;

  @ApiProperty()
  description: string;

  @ApiProperty()
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value && typeof value === 'object' && Object.keys(value).length === 0) {
      return new Date().toISOString();
    }
    return value;
  })
  createdAt: Date;

  @ApiProperty()
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value && typeof value === 'object' && Object.keys(value).length === 0) {
      return new Date().toISOString();
    }
    return value;
  })
  updatedAt: Date;

  @ApiProperty()
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value && typeof value === 'object' && Object.keys(value).length === 0) {
      return new Date().toISOString();
    }
    return value;
  })
  date: Date;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  category: TransactionCategoryInfoDto;

  @ApiProperty()
  accountId: string;

  @ApiProperty()
  account: TransactionAccountInfoDto

  @Exclude()
  userId: string;

  constructor(transaction: Transaction) {
    Object.assign(this, transaction);
  }
}
