import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateAccountDto {
  @ApiPropertyOptional({
    description: 'The new name of the account',
    example: 'Updated Savings Account',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'The new balance of the account',
    example: 1500.75,
  })
  @IsOptional()
  @IsNumber()
  balance?: number;
}
