import { Controller, Get, Post, Body, Query, Delete, ParseUUIDPipe, Put, UseInterceptors, ClassSerializerInterceptor, Param, HttpStatus } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CurrentUser } from '@common/decorators';
import { JwtPayload } from 'src/auth/interfaces';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionType } from '@prisma/client';

@ApiBearerAuth()
@ApiTags('Transaction')
@Controller('transaction')
@UseInterceptors(ClassSerializerInterceptor)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transaction created successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data'
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionService.create(createTransactionDto, user.id);
  }

  @Get('/list')
  @ApiOperation({ summary: 'Get a list of transactions with pagination and filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved list of user transactions.',
    isArray: true,
    type: TransactionResponseDto,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term to filter transactions by description or amount.',
    type: String,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Type of transaction to filter.',
    enum: TransactionType,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination. Default: 1',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of transactions per page. Default: 10',
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort transactions by. Available fields: createdAt, date, amount, description, type, account.name, category.name. Default: createdAt',
    type: String,
    example: 'date',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    description: 'Sorting order: asc (ascending) or desc (descending). Default: desc',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({
    name: 'accountId',
    required: false,
    description: 'Filter transactions by account ID.',
    type: String,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter transactions by category ID.',
    type: String,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO format) to filter transactions from. Example: 2023-01-01',
    type: String,
    example: '2023-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO format) to filter transactions to. Example: 2023-12-31',
    type: String,
    example: '2023-12-31',
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: TransactionQueryDto) {
    return this.transactionService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction found',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.transactionService.findOne(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction updated successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid update data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto
  ) {
    return this.transactionService.update(id, updateTransactionDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Transaction deleted successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.transactionService.delete(id, user.id);
    return { message: 'Transaction deleted successfully' };
  }
}
