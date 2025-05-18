import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { AccountModule } from '../account/account.module';
import { AccountCategoryModule } from '../account-category/account-category.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaTransactionRepository, TRANSACTION_REPOSITORY } from './repositories/transaction.repository';

@Module({
  imports: [
    PrismaModule,
    AccountModule,
    AccountCategoryModule
  ],
  providers: [
    TransactionService,
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: PrismaTransactionRepository
    }
  ],
  controllers: [TransactionController],
  exports: [TransactionService, TRANSACTION_REPOSITORY]
})
export class TransactionModule { }
