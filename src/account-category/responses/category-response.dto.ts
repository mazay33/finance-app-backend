import { ApiProperty } from '@nestjs/swagger';
import { Category, CategoryType } from '@prisma/client';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'UUID of the category',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Name of the category',
    example: 'Groceries'
  })
  name: string;

  @ApiProperty({
    description: 'Type of the category (EXPENSE or INCOME)',
    enum: CategoryType,
    example: 'EXPENSE'
  })
  type: CategoryType;

  @ApiProperty({
    description: 'Icon identifier for the category',
    example: 'shopping-cart'
  })
  icon: string;

  @ApiProperty({
    description: 'Color code for the category',
    example: '#FF5733',
    required: false
  })
  color?: string;

  @ApiProperty({
    description: 'UUID of the user who owns the category',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  userId: string;

  constructor(category: Category) {
    this.id = category.id;
    this.name = category.name;
    this.type = category.type;
    this.icon = category.icon;
    this.color = category.color;
    this.userId = category.userId;
  }
}
