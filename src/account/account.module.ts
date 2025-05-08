import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountCategoryService } from '../account-category/account-category.service';
import { AccountService } from './account.service';

@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountCategoryService],
})
export class AccountModule { }
