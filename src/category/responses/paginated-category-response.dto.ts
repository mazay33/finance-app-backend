import { Pagination } from '@common/types';
import { CategoryResponseDto } from './category-response.dto';

export class PaginatedCategoryResponseDto {
  data: CategoryResponseDto[];
  pagination: Pagination;
}
