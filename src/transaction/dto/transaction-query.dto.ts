import { IsEnum, IsOptional, IsString, IsNumber, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { TransactionType } from '@prisma/client';

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
  sortBy?: string = 'date';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';
}
