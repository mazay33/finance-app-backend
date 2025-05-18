import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface TransactionValidationResult {
  isValid: boolean;
  message?: string;
}

export interface TransactionBalanceChange {
  accountId: string;
  change: Decimal;
  newBalance?: Decimal;
}

export interface TransactionTypeValidation {
  type: TransactionType;
  required: string[];
  forbidden: string[];
}

export const TRANSACTION_TYPE_VALIDATION: Record<TransactionType, TransactionTypeValidation> = {
  CREDIT: {
    type: 'CREDIT',
    required: ['accountId', 'categoryId', 'amount', 'date'],
    forbidden: ['fromAccountId', 'toAccountId']
  },
  DEBIT: {
    type: 'DEBIT',
    required: ['accountId', 'categoryId', 'amount', 'date'],
    forbidden: ['fromAccountId', 'toAccountId']
  },
  TRANSFER: {
    type: 'TRANSFER',
    required: ['amount', 'fromAccountId', 'toAccountId', 'categoryId', 'date'],
    forbidden: []
  },
  ADJUSTMENT: {
    type: 'ADJUSTMENT',
    required: ['accountId', 'amount', 'categoryId', 'date'],
    forbidden: ['fromAccountId', 'toAccountId']
  }
}
