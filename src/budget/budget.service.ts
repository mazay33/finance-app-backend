// src/budget/budget.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetBudgetDto } from './dto/get-budget.dto';

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  async getBudgetWithTransactions(userId: string, dto: GetBudgetDto) {
    // Получение бюджета и транзакций за определенный период
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        category: {
          userId,
        },
        createdAt: {
          gte: dto.startDate,
          lte: dto.endDate,
        },
      },
      include: {
        category: true,
      },
    });

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: dto.startDate,
          lte: dto.endDate,
        },
      },
      include: {
        category: true,
      },
    });

    return { budgets, transactions };
  }
}
