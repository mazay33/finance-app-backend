import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { $Enums } from '@prisma/client';

export class UpdateTransactionDto {
  @ApiProperty({
    description: 'The amount of the transaction',
    example: 100.5,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'The type of the transaction (e.g., credit, debit)',
    example: 'credit',
    enum: $Enums.TransactionType,
  })
  @IsString()
  @IsNotEmpty()
  type: $Enums.TransactionType;

  @ApiProperty({
    description: 'A brief description of the transaction',
    example: 'Grocery shopping',
    type: String,
  })
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The ID of the category associated with this transaction',
    example: 'uuid',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    description: 'The ID of the account associated with this transaction',
    example: 'uuid',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    description: 'The date of the transaction',
    example: '2024-10-15',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  date: string;
}
