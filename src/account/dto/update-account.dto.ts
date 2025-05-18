import { IsBoolean, IsDecimal, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import Decimal from 'decimal.js';
import { AccountType } from '@prisma/client';
import { Currency } from '@common/enums';

export class UpdateAccountDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty({ required: false, type: String })
  @IsDecimal()
  @IsOptional()
  balance?: Decimal

  @ApiProperty({ required: false, enum: AccountType })
  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiProperty({ required: false, enum: Currency })
  @IsString()
  @IsOptional()
  currency?: string
}
