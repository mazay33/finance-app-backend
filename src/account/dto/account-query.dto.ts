import { IsEnum, IsOptional, IsString, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { AccountType } from '@prisma/client';
import { Currency } from '@common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class AccountQueryDto {

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10) || 1)
  page?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10) || 10)
  limit?: number = 10;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';
}
