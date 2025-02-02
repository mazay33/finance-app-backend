import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { AccountService } from 'src/account/account.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, TransactionService, AccountService]
})
export class DashboardModule { }
