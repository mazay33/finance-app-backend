import { ApiProperty } from "@nestjs/swagger";
import { $Enums, Account, Category, Transaction } from "@prisma/client";
import { Exclude } from "class-transformer";
import { AccountResponseDto } from "src/account/dto/account-response.dto";

export class TransactionResponseDto implements Transaction {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  type: $Enums.TransactionType;

  @ApiProperty()
  description: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  balanceAfterTransaction: number;

  @ApiProperty()
  category: Category;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  accountId: string;

  @Exclude()
  userId: string;
}
