import { IsBoolean, IsDecimal, IsEnum, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@common/enums';
import Decimal from 'decimal.js';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string

  @ApiProperty({ type: String })
  @IsDecimal()
  @IsNotEmpty()
  balance!: Decimal

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  @IsNotEmpty()
  type!: AccountType

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  description!: string

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean

  @ApiProperty({ enum: Currency })
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(Currency))
  currency!: Currency
}
