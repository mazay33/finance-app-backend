import { IsISO8601, IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class UpdateTransactionDto {
  @ApiProperty({
    description: 'The amount of the transaction',
    example: 100.5,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({
    description: 'The type of the transaction (e.g., credit, debit)',
    example: 'credit',
    enum: TransactionType,
  })
  @IsString()
  @IsOptional()
  type?: TransactionType

  @ApiProperty({
    description: 'A brief description of the transaction',
    example: 'Grocery shopping',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The ID of the category associated with this transaction',
    example: 'uuid',
    type: String,
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: 'The ID of the account associated with this transaction',
    example: 'uuid',
    type: String,
  })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiProperty({
    description: 'The date of the transaction in ISO 8601 format',
    example: '2025-01-10T13:58:21.538Z',
    type: String,
  })
  @IsISO8601()
  @IsOptional()
  date?: string;
}
