import { IsString, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCategoryDto {
  @ApiProperty({
    description: 'UUID of the account',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID('4', { message: 'accountId must be a valid UUID' })
  @IsNotEmpty({ message: 'accountId is required' })
  accountId: string;

  @ApiProperty({
    description: 'UUID of the category',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  @IsNotEmpty({ message: 'categoryId is required' })
  categoryId: string;

  // This field will be populated from CurrentUser decorator, not from request body
  userId: string;
}
