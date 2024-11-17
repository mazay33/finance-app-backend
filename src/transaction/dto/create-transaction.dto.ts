import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'The amount of the transaction',
    example: 100.5,
    type: Number,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'The type of the transaction (e.g., credit, debit)',
    example: 'credit',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'A brief description of the transaction',
    example: 'Grocery shopping',
    type: String,
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'The ID of the category associated with this transaction',
    example: 1,
    type: Number,
  })
  @IsNumber()
  categoryId: number;

  @ApiProperty({
    description: 'The ID of the account associated with this transaction',
    example: 2,
    type: Number,
  })
  @IsNumber()
  accountId: number;

  @IsString()
  date: string
}
