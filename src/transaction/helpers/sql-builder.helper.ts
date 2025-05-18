import { Prisma, TransactionType } from '@prisma/client';
import { TransactionQueryDto } from '../dto/transaction-query.dto';
import { TransactionResponseDto } from '../dto/transaction-response.dto';
import { RawTransaction } from '../interfaces';

export class TransactionSqlBuilder {
  static buildAmountSortQuery(
    userId: string,
    query: TransactionQueryDto,
  ): Prisma.Sql {
    const { search, type, accountId, categoryId, startDate, endDate, page = 1, limit = 10, order } = query;
    const queryParts = [
      Prisma.sql`
        SELECT t.*,
          a.name as "account_name",
          a.type as "account_type",
          a.currency as "account_currency",
          a.id as "account_id",
          a.description as "account_description",
          a.balance as "account_balance",
          a."isActive" as "account_isActive",
          a."createdAt" as "account_createdAt",
          a."updatedAt" as "account_updatedAt",
          c.name as "category_name",
          c.id as "category_id",
          c.type as "category_type",
          c.icon as "category_icon",
          c.color as "category_color"
        FROM "transactions" t
        LEFT JOIN "accounts" a ON t."accountId" = a.id
        LEFT JOIN "categories" c ON t."categoryId" = c.id
        WHERE t."userId" = ${userId}
      `,
    ];

    if (search) {
      queryParts.push(Prisma.sql`AND t.description ILIKE ${`%${search}%`}`);
    }
    if (type && Object.values(TransactionType).includes(type)) {
      queryParts.push(Prisma.sql`AND t.type = ${type}::"TransactionType"`);
    }
    if (accountId?.length > 0) {
      queryParts.push(Prisma.sql`AND t."accountId" IN (${Prisma.join(accountId)})`);
    }

    if (categoryId?.length > 0) {
      queryParts.push(Prisma.sql`AND t."categoryId" IN (${Prisma.join(categoryId)})`);
    }
    if (startDate) {
      queryParts.push(Prisma.sql`AND t.date >= ${new Date(startDate)}`);
    }
    if (endDate) {
      queryParts.push(Prisma.sql`AND t.date <= ${new Date(endDate)}`);
    }

    const orderDirection = order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    queryParts.push(
      Prisma.sql`ORDER BY CASE WHEN t.type = 'CREDIT' THEN -t.amount ELSE t.amount END ${orderDirection}`,
    );

    queryParts.push(Prisma.sql`LIMIT ${limit} OFFSET ${(page - 1) * limit}`);

    return Prisma.join(queryParts, ' ');
  }

  static mapRawTransactions(rawData: RawTransaction[]): TransactionResponseDto[] {
    return rawData.map((t) => {
      const transaction = {
        ...t,
        account: {
          id: t.account_id,
          name: t.account_name,
          type: t.account_type,
          currency: t.account_currency,
          description: t.account_description,
          balance: t.account_balance,
          isActive: t.account_isActive,
          createdAt: t.account_createdAt,
          updatedAt: t.account_updatedAt
        },
        category: {
          id: t.category_id,
          name: t.category_name,
          type: t.category_type,
          icon: t.category_icon,
          color: t.category_color
        }
      };

      // Create a proper TransactionResponseDto using the constructor
      return new TransactionResponseDto(transaction);
    });
  }
}
