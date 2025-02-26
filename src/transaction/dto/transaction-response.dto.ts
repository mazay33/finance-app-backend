import { Pagination } from "@common/types";
import { ApiProperty } from "@nestjs/swagger";
import { $Enums, Account, Category, Transaction } from "@prisma/client";
import { Exclude } from "class-transformer";

export class TransactionResponseDto {
  data: TransactionDto[];
  pagination: Pagination;
}

export class TransactionDto implements Transaction {
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
  category: Category;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  accountId: string;

  @Exclude()
  userId: string;
}
