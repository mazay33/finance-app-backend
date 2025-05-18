import { Injectable } from '@nestjs/common';
import { Category, CategoryType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { ICategoryRepository } from './category-repository.interface';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateCategoryDto, userId: string): Promise<Category> {
    return this.prisma.category.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findByNameAndType(name: string, type: CategoryType, userId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: {
        name,
        type,
        userId,
      },
    });
  }

  async findAll(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string, userId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, userId },
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({
      where: { id },
    });
  }

  /**
   * Выполняет массовое создание категорий в транзакции
   */
  async createMany(userId: string, categories: Omit<CreateCategoryDto & { color?: string }, 'userId'>[]): Promise<number> {
    const result = await this.prisma.category.createMany({
      data: categories.map(category => ({
        ...category,
        userId,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }

  async count(userId: string): Promise<number> {
    return this.prisma.category.count({
      where: { userId },
    });
  }

  async countTransactions(categoryId: string): Promise<number> {
    return this.prisma.transaction.count({
      where: { categoryId },
    });
  }

  /**
   * Выполняет операции в рамках транзакции
   */
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
