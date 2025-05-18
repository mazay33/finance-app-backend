import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountCategoryService } from './account-category.service';
import { AddCategoryDto } from './dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators';
import { JwtPayload } from 'src/auth/interfaces';
import { AccountCategoryResponseDto, CategoryResponseDto } from './responses';

@ApiTags('Account Categories')
@Controller('account-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class AccountCategoryController {
  constructor(private readonly service: AccountCategoryService) { }

  @Post('add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a category to an account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category successfully added to account',
    type: AccountCategoryResponseDto,
  })
  @ApiForbiddenResponse({ description: 'User does not have access to the account' })
  @ApiNotFoundResponse({ description: 'Account or category not found' })
  @ApiConflictResponse({ description: 'Category is already added to this account' })
  async addCategory(
    @Body() dto: AddCategoryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AccountCategoryResponseDto> {
    // Set the userId from the JWT payload
    return this.service.addCategoryToAccount(dto.accountId, dto.categoryId, user.id);
  }

  @Get(':accountId/categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all categories for an account' })
  @ApiParam({ name: 'accountId', description: 'ID of the account', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of categories for the account',
    type: [CategoryResponseDto],
  })
  @ApiForbiddenResponse({ description: 'User does not have access to the account' })
  @ApiNotFoundResponse({ description: 'Account not found' })
  async getCategories(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CategoryResponseDto[]> {
    return this.service.getCategoriesByAccountId(accountId, user.id);
  }

  @Delete(':accountId/:categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a category from an account' })
  @ApiParam({ name: 'accountId', description: 'ID of the account', type: 'string' })
  @ApiParam({ name: 'categoryId', description: 'ID of the category', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category successfully removed from account',
    type: AccountCategoryResponseDto,
  })
  @ApiForbiddenResponse({ description: 'User does not have access to the account' })
  @ApiNotFoundResponse({ description: 'Account, category, or relationship not found' })
  async removeCategory(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<AccountCategoryResponseDto> {
    return this.service.removeCategory(accountId, categoryId, user.id);
  }
}
