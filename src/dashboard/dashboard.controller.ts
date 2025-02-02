import { CurrentUser } from '@common/decorators';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { JwtPayload } from 'src/auth/interfaces';
import { TransactionService } from 'src/transaction/transaction.service';
import { GetChartFiltersDto } from './dto/get-chart-filters.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly transactionService: TransactionService) { }

  @Post('/chart')
  @ApiBearerAuth()
  async getChartData(
    @CurrentUser() user: JwtPayload,
    @Body() body: GetChartFiltersDto
  ) {
    const { startDate, endDate, interval } = body;

    return this.transactionService.getDailyBalanceWithTransactions(user.id, startDate, endDate, interval);
  }
}
