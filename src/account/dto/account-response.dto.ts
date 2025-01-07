import { ApiProperty } from "@nestjs/swagger";
import { Account } from "@prisma/client";
import { Exclude } from "class-transformer";

export class AccountResponseDto implements Account {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  type: string;

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
  userId: string;
}
