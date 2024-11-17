import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({
    description: 'The name of the account',
    example: 'Savings Account',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The initial balance of the account',
    example: 1000.5,
  })
  @IsNotEmpty()
  @IsNumber()
  balance: number;

  @ApiProperty({
    description: 'The ID of the user who owns the account',
    example: 'uuid-user-id',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;
}
