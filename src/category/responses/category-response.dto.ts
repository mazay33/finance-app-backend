import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Category, CategoryType } from '@prisma/client';

export class CategoryResponseDto implements Category {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CategoryType })
  type: CategoryType;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  color: string;

  @Exclude()
  userId: string;

  constructor(category: Category) {
    Object.assign(this, category);
  }
}
