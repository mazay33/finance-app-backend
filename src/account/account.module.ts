import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AccountCategoryModule } from '../account-category/account-category.module';
import { PrismaAccountRepository, ACCOUNT_REPOSITORY } from './repositories';

@Module({
  imports: [AccountCategoryModule],
  controllers: [AccountController],
  providers: [
    AccountService,
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: PrismaAccountRepository
    }
  ],
  exports: [
    AccountService,
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: PrismaAccountRepository
    }
  ],
})
export class AccountModule { }
