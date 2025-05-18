import { ApiProperty } from "@nestjs/swagger";
import { Account, AccountType } from "@prisma/client";
import { Exclude, Transform } from "class-transformer";
import Decimal from "decimal.js";

export class AccountResponseDto implements Partial<Account> {
  @ApiProperty({ description: 'Уникальный ID счета' })
  id: string;

  @ApiProperty({ description: 'Название счета' })
  name: string;

  @ApiProperty({
    description: 'Баланс счета',
    type: String,
    example: "1000.50"
  })
  @Transform(({ value }) => value.toString())
  balance: Decimal;

  @ApiProperty({
    description: 'Тип счета',
    enum: AccountType,
    enumName: 'AccountType'
  })
  type: AccountType;

  @ApiProperty({ description: 'Описание счета' })
  description: string;

  @ApiProperty({ description: 'Активен ли счет', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Код валюты счета', example: "USD" })
  currency: string;

  @ApiProperty({ description: 'Дата создания счета' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата последнего обновления счета' })
  updatedAt: Date;

  @Exclude()
  userId: string;

  constructor(account: Partial<Account>) {
    Object.assign(this, account);
  }
}
