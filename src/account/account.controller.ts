import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CreateAccountDto, AccountQueryDto, UpdateAccountDto } from './dto';
import { JwtPayload } from 'src/auth/interfaces';
import { CurrentUser } from '@common/decorators';
import { AccountResponseDto, PaginatedAccountResponseDto } from './responses';
import { AccountService } from './account.service';

@ApiTags('Account')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @ApiOperation({ summary: 'Создание счёта' })
  @ApiBody({ type: CreateAccountDto })
  @ApiResponse({ type: AccountResponseDto })
  @UseInterceptors(ClassSerializerInterceptor)
  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return await this.accountService.create(createAccountDto, user.id);
  }

  @ApiOperation({ summary: 'Получить список счетов' })
  @ApiResponse({ type: PaginatedAccountResponseDto })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('/list')
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: AccountQueryDto): Promise<PaginatedAccountResponseDto> {
    return await this.accountService.findAll(user.id, query);
  }

  @ApiOperation({ summary: 'Получить счет по ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ type: AccountResponseDto })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<AccountResponseDto> {
    return await this.accountService.findOne(id, user.id);
  }

  @ApiOperation({ summary: 'Обновить счет' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateAccountDto })
  @ApiResponse({ type: AccountResponseDto })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AccountResponseDto> {
    return await this.accountService.update(id, updateAccountDto, user.id);
  }

  @ApiOperation({ summary: 'Удалить счет' })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return await this.accountService.delete(id, user.id);
  }
}
