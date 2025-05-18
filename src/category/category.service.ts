import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
  InternalServerErrorException
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './responses/category-response.dto';
import { Cache } from 'cache-manager';
import { ICategoryService } from './interfaces/category.interface';
import { DefaultCategoriesService } from './services/default-categories.service';
import { ConfigService } from '@nestjs/config';
import { convertToSecondsUtil } from '@common/utils';
import { CATEGORY_REPOSITORY, ICategoryRepository } from './repositories';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoryService implements ICategoryService {
  private readonly logger = new Logger(CategoryService.name);
  private readonly CACHE_PREFIX = 'category';
  private readonly CACHE_TTL: number;

  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: ICategoryRepository,
    private readonly defaultCategoriesService: DefaultCategoriesService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.CACHE_TTL = convertToSecondsUtil(this.configService.get('CACHE_TTL', '1h'));
  }

  /**
   * Создает новую категорию
   */
  async create(dto: CreateCategoryDto, userId: string): Promise<CategoryResponseDto> {
    this.logger.log(`Creating category for user ${userId}: ${JSON.stringify(dto)}`);

    try {
      // Использование транзакций для атомарности операций
      const created = await this.categoryRepository.transaction(async (tx) => {
        // Проверка на существование категории с таким же именем и типом
        const existing = await this.categoryRepository.findByNameAndType(dto.name, dto.type, userId);

        if (existing) {
          throw new ConflictException('Category with this name and type already exists');
        }

        // Создание категории
        return this.categoryRepository.create({
          ...dto,
          color: dto.color || this.getRandomColor(), // Используем цвет из DTO или генерируем случайный
        }, userId);
      });

      // Сохраняем в кэше
      await this.setCacheItem(`${this.CACHE_PREFIX}:${created.id}:${userId}`, created);

      return new CategoryResponseDto(created);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to create category: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create category');
    }
  }

  /**
   * Возвращает все категории пользователя
   */
  async findAll(userId: string): Promise<CategoryResponseDto[]> {
    const cacheKey = `${this.CACHE_PREFIX}:list:${userId}`;

    try {
      // Проверяем кэш
      const cachedCategories = await this.cacheManager.get<CategoryResponseDto[]>(cacheKey);
      if (cachedCategories) {
        this.logger.debug(`Cache hit for user categories: ${userId}`);
        return cachedCategories;
      }

      this.logger.debug(`Cache miss for user categories: ${userId}`);
      const categories = await this.categoryRepository.findAll(userId);

      const responseDto = categories.map((c) => new CategoryResponseDto(c));

      // Сохраняем в кэш
      await this.cacheManager.set(cacheKey, responseDto, this.CACHE_TTL);

      return responseDto;
    } catch (error) {
      this.logger.error(`Failed to get categories for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve categories');
    }
  }

  /**
   * Возвращает категорию по ID
   */
  async findOne(id: string, userId: string): Promise<CategoryResponseDto> {
    const cacheKey = `${this.CACHE_PREFIX}:${id}:${userId}`;

    try {
      // Проверяем кэш
      const cachedCategory = await this.cacheManager.get<CategoryResponseDto>(cacheKey);
      if (cachedCategory) {
        return cachedCategory;
      }

      const category = await this.categoryRepository.findOne(id, userId);

      if (!category) {
        throw new NotFoundException('Category not found or access denied');
      }

      const responseDto = new CategoryResponseDto(category);

      // Сохраняем в кэш
      await this.setCacheItem(cacheKey, responseDto);

      return responseDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get category ${id} for user ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve category');
    }
  }

  /**
   * Обновляет категорию
   */
  async update(id: string, dto: UpdateCategoryDto, userId: string): Promise<CategoryResponseDto> {
    try {
      // Используем транзакцию для атомарности
      const updated = await this.categoryRepository.transaction(async (tx) => {
        // Проверяем существует ли категория
        const category = await this.categoryRepository.findOne(id, userId);

        if (!category) {
          throw new NotFoundException('Category not found or access denied');
        }

        // Если пользователь меняет имя или тип, проверяем уникальность
        if ((dto.name && dto.name !== category.name) ||
          (dto.type && dto.type !== category.type)) {
          const existing = await this.categoryRepository.findByNameAndType(
            dto.name || category.name,
            dto.type || category.type,
            userId
          );

          if (existing && existing.id !== id) {
            throw new ConflictException('Category with this name and type already exists');
          }
        }

        // Обновляем категорию
        return this.categoryRepository.update(id, dto);
      });

      // Очищаем кэш для пользователя
      await this.clearUserCache(userId);

      // Обновляем кэш конкретной категории
      await this.setCacheItem(`${this.CACHE_PREFIX}:${id}:${userId}`, updated);

      return new CategoryResponseDto(updated);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to update category ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update category');
    }
  }

  /**
   * Удаляет категорию
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      // Проверяем существование категории и права доступа
      const category = await this.categoryRepository.findOne(id, userId);

      if (!category) {
        throw new NotFoundException('Category not found or access denied');
      }

      // Проверяем, есть ли транзакции, связанные с этой категорией
      const transactionCount = await this.categoryRepository.countTransactions(id);

      // Удаляем категорию в рамках транзакции
      await this.categoryRepository.transaction(async (tx) => {
        if (transactionCount > 0) {
          this.logger.warn(`Deleting category ${id} that has ${transactionCount} transactions`);
          // Тут можно добавить дополнительную логику по обработке связанных транзакций
        }

        await this.categoryRepository.delete(id);
      });

      // Очищаем кэш
      await this.clearUserCache(userId);
      await this.cacheManager.del(`${this.CACHE_PREFIX}:${id}:${userId}`);

      this.logger.log(`Category ${id} for user ${userId} successfully deleted`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Обрабатываем известные ошибки Prisma
        if (error.code === 'P2003') { // Foreign key constraint failed
          this.logger.error(`Cannot delete category ${id} due to foreign key constraints`, error.stack);
          throw new ConflictException('Cannot delete category that has related records');
        }
      }

      this.logger.error(`Failed to delete category ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete category');
    }
  }

  /**
   * Создает дефолтные категории для пользователя
   */
  async createDefaultCategories(userId: string): Promise<void> {
    return this.defaultCategoriesService.createForUser(userId);
  }

  /**
   * Сохраняет элемент в кэш
   */
  private async setCacheItem(key: string, value: any): Promise<void> {
    await this.cacheManager.set(key, value, this.CACHE_TTL);
  }

  /**
   * Очищает все кэши категорий пользователя
   */
  private async clearUserCache(userId: string): Promise<void> {
    await this.cacheManager.del(`${this.CACHE_PREFIX}:list:${userId}`);
  }

  /**
   * Генерирует случайный цвет в HEX формате
   */
  private getRandomColor(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }
}
