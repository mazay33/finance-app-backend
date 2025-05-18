import { Currency } from '@common/enums';
import { AccountType, Transaction } from '@prisma/client';
import { Prisma } from '@prisma/client';

export type TransactionWhereInput = Prisma.TransactionWhereInput;
export type TransactionOrderBy = Prisma.TransactionOrderByWithRelationInput;

export interface TransactionQueryConfig {
  where: TransactionWhereInput;
  orderBy: TransactionOrderBy[];
  page: number;
  limit: number;
  includeRelations: boolean;
}

export interface RawTransaction extends Transaction {
  account_name: string;
  account_type: AccountType;
  account_currency: Currency;
  category_name: string;

  // Additional account fields
  account_id: string;
  account_description: string;
  account_balance: any;
  account_isActive: boolean;
  account_createdAt: Date;
  account_updatedAt: Date;

  // Additional category fields
  category_id: string;
  category_type: string;
  category_icon: string;
  category_color: string;
}
