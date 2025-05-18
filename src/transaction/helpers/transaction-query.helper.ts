import {
  TransactionWhereInput,
  TransactionOrderBy,
  TransactionQueryConfig,
} from '../interfaces/transaction-query.interface';
import { TransactionQueryDto } from '../dto/transaction-query.dto';

export class TransactionQueryBuilder {
  static buildWhereClause(
    userId: string,
    query: TransactionQueryDto,
  ): TransactionWhereInput {
    const where: TransactionWhereInput = { userId };
    const { search, type, accountId, categoryId, startDate, endDate } = query;

    if (accountId?.length > 0) {
      where.accountId = { in: accountId };
    }

    if (categoryId?.length > 0) {
      where.categoryId = { in: categoryId };
    }
    if (type) where.type = type;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    return where;
  }

  static buildOrderBy(
    sortBy?: string,
    order?: 'asc' | 'desc',
  ): TransactionOrderBy[] {
    if (!sortBy) return [{ createdAt: 'desc' }];

    const [field, nestedField] = sortBy.split('.');

    if (nestedField) {
      return [{ [field]: { [nestedField]: order || 'desc' } }, { createdAt: 'desc' }];
    }

    return [{ [field]: order || 'desc' }, { createdAt: 'desc' }];
  }

  static buildQueryConfig(
    userId: string,
    query: TransactionQueryDto,
  ): TransactionQueryConfig {
    return {
      where: this.buildWhereClause(userId, query),
      orderBy: this.buildOrderBy(query.sortBy, query.order),
      page: query.page || 1,
      limit: query.limit || 10,
      includeRelations: true,
    };
  }
}
