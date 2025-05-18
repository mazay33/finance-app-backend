import { Inject, Injectable, Logger } from '@nestjs/common';
import { DEFAULT_CATEGORIES } from '../default-categories.constant';
import { CATEGORY_REPOSITORY, ICategoryRepository } from '../repositories';

@Injectable()
export class DefaultCategoriesService {
  private readonly logger = new Logger(DefaultCategoriesService.name);

  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: ICategoryRepository
  ) { }

  /**
   * Создает дефолтные категории для пользователя
   * @param userId ID пользователя
   */
  async createForUser(userId: string): Promise<void> {
    this.logger.log(`Creating default categories for user ${userId}`);

    try {
      // Используем транзакцию для атомарной операции
      await this.categoryRepository.transaction(async (tx) => {
        // Проверяем, есть ли у пользователя уже категории
        const existingCategories = await this.categoryRepository.count(userId);

        if (existingCategories > 0) {
          this.logger.log(`User ${userId} already has categories, skipping default creation`);
          return;
        }

        // Создаем дефолтные категории
        const categoriesWithColors = DEFAULT_CATEGORIES.map(category => ({
          ...category,
          color: this.getRandomColor(), // Добавляем случайный цвет
        }));

        const createdCount = await this.categoryRepository.createMany(userId, categoriesWithColors);

        this.logger.log(`Successfully created ${createdCount} default categories for user ${userId}`);
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
