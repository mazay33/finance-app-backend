import { Category, CategoryType, Prisma } from '@prisma/client';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

/**
 * Интерфейс репозитория категорий
 */
export interface ICategoryRepository {
  /**
   * Создает новую категорию
   * @param dto Данные для создания категории
   * @param userId ID пользователя
   */
  create(dto: CreateCategoryDto, userId: string): Promise<Category>;

  /**
   * Проверяет наличие категории с таким же именем и типом
   * @param name Название категории
   * @param type Тип категории
   * @param userId ID пользователя
   */
  findByNameAndType(name: string, type: CategoryType, userId: string): Promise<Category | null>;

  /**
   * Находит все категории пользователя
   * @param userId ID пользователя
   */
  findAll(userId: string): Promise<Category[]>;

  /**
   * Находит категорию по ID
   * @param id ID категории
   * @param userId ID пользователя
   */
  findOne(id: string, userId: string): Promise<Category | null>;

  /**
   * Обновляет категорию
   * @param id ID категории
   * @param dto Данные для обновления
   */
  update(id: string, dto: UpdateCategoryDto): Promise<Category>;

  /**
   * Удаляет категорию
   * @param id ID категории
   */
  delete(id: string): Promise<void>;

  /**
   * Создает набор дефолтных категорий для пользователя
   * @param userId ID пользователя
   * @param categories Массив категорий для создания
   */
  createMany(userId: string, categories: Omit<CreateCategoryDto & { color?: string }, 'userId'>[]): Promise<number>;

  /**
   * Подсчитывает количество категорий пользователя
   * @param userId ID пользователя
   */
  count(userId: string): Promise<number>;

  /**
   * Подсчитывает количество транзакций для категории
   * @param categoryId ID категории
   */
  countTransactions(categoryId: string): Promise<number>;

  /**
   * Выполняет операции в рамках транзакции
   * @param fn Функция, выполняемая в транзакции
   */
  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
