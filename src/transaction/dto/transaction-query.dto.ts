import { IsEnum, IsOptional, IsString, IsNumber, IsInt, IsIn, IsISO8601 } from 'class-validator';
import { Transform } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export const SORTABLE_FIELDS = [
  'createdAt',
  'date',
  'amount',
  'description',
  'type',
  'account.name',
  'category.name',
] as const;

export type TranscationSortableField = typeof SORTABLE_FIELDS[number];

export class TransactionQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10) || 1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10) || 10)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: TranscationSortableField = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value?.split(',') || []
  )
  accountId?: string[];

  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value?.split(',') || []
  )
  categoryId?: string[];


  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => value ? new Date(value).toISOString() : null)
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => value ? new Date(value).toISOString() : null)
  endDate?: string;
}
