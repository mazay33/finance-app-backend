import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_CATEGORIES } from '../default-categories.constant';

@Injectable()
export class UserCategoryService {
  private readonly logger = new Logger(UserCategoryService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Создает дефолтные категории для пользователя при регистрации
   * @param userId ID пользователя
   */
  async createDefaultCategoriesForUser(userId: string): Promise<void> {
    this.logger.log(`Creating default categories for newly registered user ${userId}`);

    try {
      // Используем транзакцию для атомарной операции
      await this.prisma.$transaction(async (tx) => {
        // Проверяем, есть ли у пользователя уже категории
        const existingCategories = await tx.category.count({
          where: { userId }
        });

        if (existingCategories > 0) {
          this.logger.log(`User ${userId} already has categories, skipping default creation`);
          return;
        }

        // Создаем дефолтные категории
        await tx.category.createMany({
          data: DEFAULT_CATEGORIES.map(category => ({
            ...category,
            userId,
            color: this.getRandomColor(), // Добавляем случайный цвет
          })),
          skipDuplicates: true,
        });

        this.logger.log(`Successfully created ${DEFAULT_CATEGORIES.length} default categories for user ${userId}`);
      });
    } catch (error) {
      this.logger.error(`Failed to create default categories for user ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Генерирует случайный цвет в HEX формате
   */
  private getRandomColor(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }
}
