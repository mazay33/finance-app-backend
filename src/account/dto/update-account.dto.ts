import { IsBoolean, IsDecimal, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import Decimal from 'decimal.js';
import { AccountType } from '@prisma/client';

export class UpdateAccountDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty()
  @IsDecimal()
  @IsOptional()
  balance?: Decimal

  @ApiProperty()
  @IsEnum(AccountType)
  @IsNotEmpty()
  type!: AccountType

  @ApiProperty()
  @IsString()
  description?: string

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiProperty()
  @IsString()
  @IsOptional()
  currency?: string
}
