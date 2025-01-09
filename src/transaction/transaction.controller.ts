import { Controller, Get, Post, Body, Query, Delete, ParseIntPipe, Put } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CurrentUser } from '@common/decorators';
import { JwtPayload } from 'src/auth/interfaces';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@ApiBearerAuth()
@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) { }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionService.create(createTransactionDto, user.id);
  }

  @Get('/list')
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved list of user transactions.',
    isArray: true,
    type: TransactionResponseDto,
  })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.transactionService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Query('id') id: string) {
    return this.transactionService.findOne(id, user.id);
  }

  @Put(':id')
  upadte(
    @CurrentUser() user: JwtPayload,
    @Query('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto
  ) {
    return this.transactionService.update(id, updateTransactionDto, user.id)
  }
  @Delete(':id')
  delete(
    @CurrentUser() user: JwtPayload,
    @Query('id') id: string
  ) {
    return this.transactionService.delete(id, user.id)
  }


  // @Get('daily-balances')
  // async getBalances(
  //   @CurrentUser() user: JwtPayload,
  //   @Query('startDate')
  //   startDate: string,
  //   @Query('endDate') endDate: string,
  //   @Query('interval') interval: 'daily' | 'weekly',
  // ) {
  //   const start = new Date(startDate);
  //   const end = new Date(endDate);
  //   end.setHours(23, 59, 59, 999);

  //   return this.transactionService.getBalances(user.id, start, end, interval);
  // }

  // @Get('expenses-by-category')
  // @ApiQuery({ name: 'startDate', required: false })
  // @ApiQuery({ name: 'endDate', required: false })
  // async getExpensesByCategory(
  //   @CurrentUser() user: JwtPayload,
  //   @Query('startDate') startDate?: string,
  //   @Query('endDate') endDate?: string,
  // ) {

  //   const start = new Date(startDate);
  //   const end = new Date(endDate);
  //   end.setHours(23, 59, 59, 999);

  //   return this.transactionService.getExpensesByCategory(user.id, start, end);
  // }
}
