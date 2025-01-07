import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {

  @ApiProperty({
    description: 'The name of the account',
    example: 'Savings Account',
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    description: 'The balance of the account',
    example: 1000.00,
  })
  @IsNumber()
  @IsNotEmpty()
  balance: number

  @ApiProperty({
    description: 'The type of the account',
    example: 'savings',
  })
  @IsString()
  @IsNotEmpty()
  type: string

  @ApiProperty({
    description: 'The description of the account',
    example: 'Savings account for personal use',
  })
  @IsString()
  description: string

  @ApiProperty({
    description: 'The status of the account',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean

  @ApiProperty({
    description: 'The currency of the account',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  currency: string
}
