import { ApiProperty } from "@nestjs/swagger";
import { Account, AccountType } from "@prisma/client";
import { Exclude, Transform } from "class-transformer";
import Decimal from "decimal.js";



export class AccountResponseDto implements Account {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  @Transform(({ value }) => value.toString())
  balance: Decimal;

  @ApiProperty()
  type: AccountType;

  @ApiProperty()
  description: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @Exclude()
  @ApiProperty()
  userId: string;

  constructor(account: Account) {
    Object.assign(this, account);
  }
}
