import { Module } from '@nestjs/common';
import { AccountCategoryController } from './account-category.controller';
import { AccountCategoryService } from './account-category.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Module for managing account-category relationships
 * Provides functionality to associate categories with accounts
 */
@Module({
  imports: [PrismaModule],
  controllers: [AccountCategoryController],
  providers: [
    AccountCategoryService,
    PrismaService
  ],
  exports: [AccountCategoryService],
})
export class AccountCategoryModule { }
