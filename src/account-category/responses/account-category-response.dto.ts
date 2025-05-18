import { AccountCategory } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class AccountCategoryResponseDto implements AccountCategory {
  @ApiProperty({
    description: 'UUID of the account',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  accountId: string;

  @ApiProperty({
    description: 'UUID of the category',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  categoryId: string;

  @ApiProperty({
    description: 'UUID of the user who added the category to the account',
    example: '123e4567-e89b-12d3-a456-426614174002'
  })
  addedById: string;

  @ApiProperty({
    description: 'Date when the category was added to the account',
    example: '2023-01-01T00:00:00.000Z'
  })
  addedAt: Date;
}
