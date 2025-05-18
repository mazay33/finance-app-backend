import { Category } from '@prisma/client';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryResponseDto } from '../responses/category-response.dto';

export interface ICategoryService {
  create(dto: CreateCategoryDto, userId: string): Promise<CategoryResponseDto>;
  findAll(userId: string): Promise<CategoryResponseDto[]>;
  findOne(id: string, userId: string): Promise<CategoryResponseDto>;
  update(id: string, dto: UpdateCategoryDto, userId: string): Promise<CategoryResponseDto>;
  delete(id: string, userId: string): Promise<void>;
  createDefaultCategories(userId: string): Promise<void>;
}

export const CATEGORY_SERVICE = 'CATEGORY_SERVICE';
