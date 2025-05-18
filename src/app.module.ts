import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BudgetModule } from './budget/budget.module';
import { TransactionModule } from './transaction/transaction.module';
import { AccountModule } from './account/account.module';
import { CategoryModule } from './category/category.module';
import { AdminModule } from './admin/admin.module';
// import { DashboardModule } from './dashboard/dashboard.module';
import { AccountCategoryModule } from './account-category/account-category.module';

@Module({
  imports: [
    CacheModule.register(),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    AdminModule,
    AccountModule,
    TransactionModule,
    CategoryModule,
    AccountCategoryModule,
    BudgetModule,
    // DashboardModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
