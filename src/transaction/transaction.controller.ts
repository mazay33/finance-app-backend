import { Controller, Get, Post, Body, Query, Delete, ParseIntPipe } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CurrentUser } from '@common/decorators';
import { JwtPayload } from 'src/auth/interfaces';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionService.create(user.id, createTransactionDto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.transactionService.findAll(user.id);
  }
  @Delete(':id')
  delete(
    @CurrentUser() user: JwtPayload,
    @Query('id', ParseIntPipe) id: number
  )
  {
    return this.transactionService.delete(user.id, id)
  }


  @Get('daily-balances')
  async getBalances(
    @CurrentUser() user: JwtPayload,
    @Query('startDate')
    startDate: string,
    @Query('endDate') endDate: string,
    @Query('interval') interval: 'daily' | 'weekly',
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.transactionService.getBalances(user.id, start, end, interval);
  }

  @Get('expenses-by-category')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
async getExpensesByCategory(
  @CurrentUser() user: JwtPayload,
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
) {

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return this.transactionService.getExpensesByCategory(user.id, start, end);
}
}
