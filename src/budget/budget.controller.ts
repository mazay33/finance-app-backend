import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { GetBudgetDto } from './dto/get-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators';
import { JwtPayload } from 'src/auth/interfaces';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Budget')
@Controller('budget')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) { }

  @ApiBearerAuth()
  @Get('')
  async getBudget(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetBudgetDto,
  ) {
    return this.budgetService.getBudgetWithTransactions(user.id, query);
  }
}
