import { BadRequestException } from '@nestjs/common';
import { AccountType, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { TransactionBalanceChange, TransactionValidationResult, TRANSACTION_TYPE_VALIDATION } from '../interfaces';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';

export class TransactionValidator {
  static validateCreate(dto: CreateTransactionDto): TransactionValidationResult {
    // Check transaction type
    if (!this.isValidType(dto.type)) {
      return {
        isValid: false,
        message: `Invalid transaction type: ${dto.type}. Valid types are ${Object.values(TransactionType).join(', ')}`
      };
    }

    // Check required fields for specific transaction type
    const validation = TRANSACTION_TYPE_VALIDATION[dto.type];
    const missingFields = validation.required.filter(field => !(dto as any)[field]);

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `Transaction of type ${dto.type} requires fields: ${missingFields.join(', ')}`
      };
    }

    // Check forbidden fields
    const forbiddenFields = validation.forbidden.filter(field => (dto as any)[field] !== undefined);

    if (forbiddenFields.length > 0) {
      return {
        isValid: false,
        message: `Transaction of type ${dto.type} cannot have fields: ${forbiddenFields.join(', ')}`
      };
    }

    // Validate amount
    try {
      const amountValue = typeof dto.amount === 'string'
        ? new Decimal(dto.amount)
        : dto.amount instanceof Decimal
          ? dto.amount
          : new Decimal(dto.amount);

      if (amountValue.lte(new Decimal(0))) {
        return {
          isValid: false,
          message: 'Transaction amount must be greater than zero'
        };
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Invalid amount format'
      };
    }

    // Validate date
    const date = new Date(dto.date);
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        message: 'Invalid date format'
      };
    }

    if (date > new Date()) {
      return {
        isValid: false,
        message: 'Transaction date cannot be in the future'
      };
    }

    return { isValid: true };
  }

  static validateUpdate(dto: UpdateTransactionDto): TransactionValidationResult {
    if (dto.type && !this.isValidType(dto.type)) {
      return {
        isValid: false,
        message: `Invalid transaction type: ${dto.type}. Valid types are ${Object.values(TransactionType).join(', ')}`
      };
    }

    // Validate amount if provided
    if (dto.amount) {
      try {
        const amountValue = typeof dto.amount === 'string'
          ? new Decimal(dto.amount)
          : dto.amount instanceof Decimal
            ? dto.amount
            : new Decimal(dto.amount);

        if (amountValue.lte(new Decimal(0))) {
          return {
            isValid: false,
            message: 'Transaction amount must be greater than zero'
          };
        }
      } catch (error) {
        return {
          isValid: false,
          message: 'Invalid amount format'
        };
      }
    }

    // Validate date if provided
    if (dto.date) {
      const date = new Date(dto.date);
      if (isNaN(date.getTime())) {
        return {
          isValid: false,
          message: 'Invalid date format'
        };
      }

      if (date > new Date()) {
        return {
          isValid: false,
          message: 'Transaction date cannot be in the future'
        };
      }
    }

    return { isValid: true };
  }

  static isValidType(type: string): boolean {
    return Object.values(TransactionType).includes(type as TransactionType);
  }

  static calculateBalanceChanges(
    type: TransactionType,
    amount: string | Decimal,
    sourceAccountId?: string,
    destinationAccountId?: string
  ): TransactionBalanceChange[] {
    // Convert amount to Decimal if it's a string
    const decimalAmount = typeof amount === 'string' ? new Decimal(amount) : amount;

    switch (type) {
      case 'DEBIT':
        return [{ accountId: sourceAccountId, change: decimalAmount }];
      case 'CREDIT':
        return [{ accountId: sourceAccountId, change: decimalAmount.negated() }];
      case 'TRANSFER':
        if (!sourceAccountId || !destinationAccountId) {
          throw new BadRequestException('Transfer requires source and destination account IDs');
        }
        return [
          { accountId: sourceAccountId, change: decimalAmount.negated() },
          { accountId: destinationAccountId, change: decimalAmount }
        ];
      case 'ADJUSTMENT':
        return [{ accountId: sourceAccountId, change: new Decimal(0) }]; // Adjustment directly sets balance
      default:
        throw new BadRequestException(`Unsupported transaction type: ${type}`);
    }
  }

  static validateAccountsForTransaction(
    type: TransactionType,
    sourceAccount: { id: string; type: AccountType } | null,
    destinationAccount: { id: string; type: AccountType } | null
  ): TransactionValidationResult {
    // Check if source account exists when required
    if (['CREDIT', 'DEBIT', 'ADJUSTMENT'].includes(type) && !sourceAccount) {
      return {
        isValid: false,
        message: `Account not found or you don't have access to it`
      };
    }

    // For transfers, check both accounts
    if (type === 'TRANSFER') {
      if (!sourceAccount || !destinationAccount) {
        return {
          isValid: false,
          message: 'Both source and destination accounts are required for transfers'
        };
      }

      if (sourceAccount.id === destinationAccount.id) {
        return {
          isValid: false,
          message: 'Source and destination accounts must be different'
        };
      }
    }

    return { isValid: true };
  }
}
