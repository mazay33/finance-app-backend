import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Еда', description: 'Название категории' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: CategoryType, example: CategoryType.EXPENSE })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiProperty({ example: '🍔', description: 'Иконка категории' })
  @IsString()
  icon: string;

  @ApiProperty({ example: '#FF5733', description: 'Цвет категории в HEX формате', required: false })
  @IsString()
  @IsOptional()
  color?: string;
}
